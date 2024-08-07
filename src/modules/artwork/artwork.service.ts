import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parse } from 'csv-parse/sync';
import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import sharp from 'sharp';

import { ContextProvider } from '../../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { ImportArtworkDto } from './dto/import-artwork.dto';
import { ArtworkGraphql } from './artwork.graphql';
import { generateSlug } from '../manga/util';

@Injectable()
export class ArtworkService implements OnModuleInit {
  private readonly logger = new Logger(ArtworkService.name);
  private googleService;

  constructor(
    private configService: ConfigService,
    private fileService: FilesService,
    private artworkGraphql: ArtworkGraphql
  ) {}

  onModuleInit() {
    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/drive',
      keyFilename: this.configService.get<string>('google.analytics.keyFile'),
    }) as any;
    this.googleService = google.drive({ version: 'v3', auth });
  }

  async import(data: ImportArtworkDto, file: Express.Multer.File) {
    const { token } = ContextProvider.getAuthUser();
    const { contest_id, contest_round } = data;

    // validate file

    // parse data
    const records = parse(file.buffer, {
      delimiter: ',',
    });

    const creatorArtworks = records.map((record: string[]) => ({
      creator: record[0].trim(),
      artworks: [record[2].trim(), record[3]?.trim() || ''],
    }));

    // chunk array to small array
    const chunkSize = 20;
    for (let i = 0; i < creatorArtworks.length; i += chunkSize) {
      const chunked = creatorArtworks.slice(i, i + chunkSize);
      this.logger.debug(`Upload process: ${i}/${creatorArtworks.length}`);

      await Promise.all(
        chunked.map(({ creator, artworks }) => {
          return this.importProcess(
            token,
            contest_id,
            contest_round,
            creator,
            artworks
          );
        })
      );
    }

    return creatorArtworks;
  }

  private async importProcess(
    token: string,
    contest_id: number,
    contest_round: number,
    creator: string,
    artworks: string[]
  ) {
    const insertCreatorResult = await this.artworkGraphql.insertCreator(
      {
        object: {
          name: creator,
          pen_name: creator,
          slug: generateSlug(creator),
        },
      },
      token
    );

    const vaidArtworks = artworks.filter((str) => str !== '');

    if (!insertCreatorResult.errors) {
      const creatorId = insertCreatorResult.data.insert_creators_one.id;

      // upload image to s3
      const crawlPromises = vaidArtworks.map(async (artwork: string) => {
        return this.crawlImage(artwork);
      });
      const crawlImageResult = (await Promise.all(crawlPromises)).filter(
        (result) => result.buffer
      );

      const s3SubFolder =
        this.configService.get<string>('aws.s3SubFolder') || 'images';

      // resize
      const resizedArtworks = await Promise.all(
        crawlImageResult.map(async (image) => {
          return sharp(image.buffer)
            .resize(1366, 768, { fit: 'inside' })
            .png({ quality: 80 })
            .toBuffer();
        })
      );

      // upload images
      await Promise.all(
        crawlImageResult.map((image, index) => {
          const keyName = `${s3SubFolder}/creator-${creatorId}/artworks/${contest_round}-${index}.jpg`;
          return this.fileService.uploadToS3(
            keyName,
            resizedArtworks[index],
            image.mimeType
          );
        })
      );

      const newArtworks = vaidArtworks.map(
        (artwork: string, index: number) => ({
          contest_id,
          contest_round,
          creator_id: creatorId,
          source_url: artwork,
          url: new URL(
            `${s3SubFolder}/creator-${creatorId}/artworks/${contest_round}-${index}.jpg`,
            this.configService.get<string>('aws.queryEndpoint')
          ).href,
        })
      );

      const insertArtworkResult = await this.artworkGraphql.insertArtwork(
        {
          objects: newArtworks,
        },
        token
      );

      this.logger.debug(insertArtworkResult);
    } else {
      console.log(creator);
    }
  }

  private async crawlImage(artWorkUrl: string) {
    if (artWorkUrl.indexOf('imgur') > 0) {
      return this.crawlImgurImage(artWorkUrl + '.jpg');
    }

    if (artWorkUrl.indexOf('drive.google.com') > 0) {
      return this.crawlGoogleDriveImage(artWorkUrl);
    }
  }

  private async crawlImgurImage(url: string) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      const mimeType = response.headers['content-type'] as string;
      const buffer = Buffer.from(response.data, 'utf-8');

      return {
        mimeType,
        buffer,
      };
    } catch (error) {
      return {
        errors: {
          message: JSON.stringify(error),
        },
      };
    }
  }

  private async crawlGoogleDriveImage(url: string) {
    const fileId = url.split('/')?.[5];
    try {
      const file = (await this.googleService.files.get(
        {
          fileId: fileId,
          alt: 'media',
        },
        {
          responseType: 'arraybuffer',
        }
      )) as any;
      const mimeType = file.headers['content-type'] as string;
      const buffer = Buffer.from(file.data, 'utf-8');

      return {
        mimeType,
        buffer,
      };
    } catch (error) {
      this.logger.error(`cannot get image from url: ${url}`);
      return {
        errors: {
          message: JSON.stringify(error),
        },
      };
    }
  }
}

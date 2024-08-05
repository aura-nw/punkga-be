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

    creatorArtworks.forEach(async ({ creator, artworks }) => {
      // insert creator
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
      if (!insertCreatorResult.errors) {
        const creatorId = insertCreatorResult.data.insert_creators_one.id;

        // upload image to s3
        const crawlImageResult = artworks
          .filter((str) => str !== '')
          .map(async (artwork: string) => {
            const result = await this.crawlImage(artwork);
            return result;
          });
        // const crawlImageResult = await Promise.all(crawlPromises);

        const s3SubFolder =
          this.configService.get<string>('aws.s3SubFolder') || 'images';

        await Promise.all(
          crawlImageResult
            .filter((result) => result.buffer)
            .map((image, index) => {
              const keyName = `${s3SubFolder}/creator-${creatorId}/artworks/${contest_round}-${index}.jpg`;
              return this.fileService.uploadToS3(
                keyName,
                image.buffer,
                image.mimeType
              );
            })
        );

        const newArtworks = artworks
          .filter((str) => str !== '')
          .map((artwork: string, index: number) => ({
            contest_id,
            contest_round,
            creator_id: creatorId,
            source_url: artwork,
            url: new URL(
              `${s3SubFolder}/creator-${creatorId}/artworks/${contest_round}-${index}.jpg`,
              this.configService.get<string>('aws.queryEndpoint')
            ).href,
          }));

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
    });

    return creatorArtworks;
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
    // const auth = new GoogleAuth({
    //   scopes: 'https://www.googleapis.com/auth/drive',
    //   keyFilename: this.configService.get<string>('google.analytics.keyFile'),
    // }) as any;
    // const service = google.drive({ version: 'v3', auth });

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

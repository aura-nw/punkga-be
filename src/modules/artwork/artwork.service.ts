import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parse } from 'csv-parse/sync';
import axios from 'axios';

import { ContextProvider } from '../../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { ImportArtworkDto } from './dto/import-artwork.dto';
import { ArtworkGraphql } from './artwork.graphql';
import { generateSlug } from '../manga/util';

@Injectable()
export class ArtworkService {
  private readonly logger = new Logger(ArtworkService.name);

  constructor(
    private configService: ConfigService,
    private fileService: FilesService,
    private artworkGraphql: ArtworkGraphql
  ) {}

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
        const crawlPromises = artworks
          .filter((str) => str !== '')
          .map((artwork: string) => {
            let url = artwork;
            if (artwork.indexOf('imgur') > 0) url = artwork + '.jpg';
            if (artwork.indexOf('drive.google.com') > 0)
              url = `https://lh3.googleusercontent.com/d/${
                artwork.split('/')?.[5]
              }`;
            return this.crawlImage(url);
          });
        const crawlImageResult = await Promise.all(crawlPromises);

        const s3SubFolder =
          this.configService.get<string>('aws.s3SubFolder') || 'images';

        await Promise.all(
          crawlImageResult.map((image, index) => {
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

  private async crawlImage(url: string) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      const mimeType = response.headers['content-type'];
      const buffer = Buffer.from(response.data, 'utf-8');

      return {
        mimeType,
        buffer,
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

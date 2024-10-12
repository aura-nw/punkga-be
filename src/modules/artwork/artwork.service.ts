import {
  Injectable,
  Logger,
  NotFoundException,
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
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { CreatorService } from '../creator/creator.service';
import { DeleteArtworksDto } from './dto/delete-artworks.dto';

@Injectable()
export class ArtworkService implements OnModuleInit {
  private readonly logger = new Logger(ArtworkService.name);
  private googleService;

  constructor(
    private configService: ConfigService,
    private fileService: FilesService,
    private artworkGraphql: ArtworkGraphql,
    private creatorService: CreatorService
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

      try {
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
      } catch (error) {
        this.logger.error(error);
      }
    }

    return creatorArtworks;
  }

  async upload(albumId: number, files: Array<Express.Multer.File>) {
    const creatorId = await this.creatorService.getCreatorIdAuthToken();

    // get creator album
    const result = await this.artworkGraphql.getCreatorAlbum({
      id: albumId,
      creator_id: creatorId,
    });
    if (result.errors) return result;
    if (result.data.albums.length === 0)
      throw new NotFoundException('album not found');

    // resize
    const resizedArtworks = await Promise.all(
      files.map(async (file) => {
        return sharp(file.buffer)
          .resize(1366, 768, { fit: 'inside' })
          .png({ quality: 80 })
          .toBuffer()
          .catch(function (err) {
            console.log('Error occured ', err);
            return file.buffer;
          });
      })
    );

    const artworks = [];
    const s3SubFolder =
      this.configService.get<string>('aws.s3SubFolder') || 'images';
    const s3Path = `${s3SubFolder}/creators/${creatorId}/albums/${albumId}`;

    // map files
    const uploadPromises = files.map((file, index) => {
      if (file.mimetype.includes('image')) {
        return this.fileService.uploadToS3(
          `${s3Path}/${file.fieldname}-${file.originalname}`,
          resizedArtworks[index],
          file.mimetype
        );
      }

      return undefined;
    });

    const uploadResult = await Promise.all(uploadPromises);
    for (const index in files) {
      const file = files[index];
      if (uploadResult[index]) {
        // throw error if upload failed
        if (uploadResult[index].$metadata.httpStatusCode !== 200)
          throw new Error('Upload fail' + JSON.stringify(uploadResult));

        // build uploaded url
        const uploadedUrl = new URL(
          `${s3Path}/${file.fieldname}-${file.originalname}`,
          this.configService.get<string>('aws.queryEndpoint')
        ).href;

        switch (file.fieldname) {
          case 'artworks':
            artworks.push({
              url: uploadedUrl,
              name: file.originalname,
            });
            break;
          default:
            break;
        }
      }
    }

    const artworkData = artworks.map((artwork) => ({
      album_id: albumId,
      url: artwork.url,
      name: artwork.name,
      creator_id: creatorId,
    }));

    // insert
    const insertArtworksResult = await this.artworkGraphql.insertArtworks({
      objects: artworkData,
    });

    if (insertArtworksResult.errors) return insertArtworksResult;
    return result;
  }

  async update(id: number, data: UpdateArtworkDto) {
    const creatorId = await this.creatorService.getCreatorIdAuthToken();
    return this.artworkGraphql.updateArtwork({
      id,
      creator_id: creatorId,
      data: {
        name: data.name,
      },
    });
  }

  async deleteArtworks(data: DeleteArtworksDto) {
    const creatorId = await this.creatorService.getCreatorIdAuthToken();
    return this.artworkGraphql.deleteArtworks({
      ids: data.ids,
      creator_id: creatorId,
    });
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
      const crawlPromises = [];
      const urls = [];
      for (const artwork of vaidArtworks) {
        // vaidArtworks.forEach(async (artwork: string) => {
        if (artwork.indexOf('drive.google.com/drive/folders') > 0) {
          // get all file in google drive folder
          const files = await this.crawlGoogleDriveFolder(artwork);
          files.forEach((file) => {
            const fileUrl = `https://drive.google.com/file/d/${file.id}`;
            urls.push(fileUrl);
            crawlPromises.push(this.crawlImage(fileUrl));
          });
        } else if (artwork.indexOf('imgur.com/a/') > 0) {
          // get all file in imgur album
          const files = await this.crawlImgurAlbum(artwork);
          files.forEach((file) => {
            const fileUrl = `https://i.imgur.com/${file.id}.jpg`;
            urls.push(fileUrl);
            crawlPromises.push(this.crawlImage(fileUrl));
          });
        } else {
          urls.push(artwork);
          crawlPromises.push(this.crawlImage(artwork));
        }
      }
      const crawlImageResult = (await Promise.all(crawlPromises)).filter(
        (result) => result.buffer
      );

      const s3SubFolder =
        this.configService.get<string>('aws.s3SubFolder') || 'images';

      // resize
      const resizedArtworks = await Promise.all(
        crawlImageResult.map(async (image, index) => {
          return sharp(image.buffer)
            .resize(1366, 768, { fit: 'inside' })
            .png({ quality: 80 })
            .toBuffer()
            .catch(function (err) {
              console.log('Error occured ', err);
              console.log(urls[index]);
              return image.buffer;
            });
        })
      );

      // upload images
      const filenames: string[] = [];
      await Promise.all(
        crawlImageResult.map((image, index) => {
          const filename = `${contest_round}-${index}-${Number(
            new Date()
          ).toString()}.jpg`;
          filenames.push(filename);
          const keyName = `${s3SubFolder}/creator-${creatorId}/artworks/${filename}`;
          return this.fileService.uploadToS3(
            keyName,
            resizedArtworks[index],
            image.mimeType
          );
        })
      );

      const newArtworks = filenames.map((filename) => ({
        contest_id,
        contest_round,
        creator_id: creatorId,
        source_url: vaidArtworks.join(','),
        url: new URL(
          `${s3SubFolder}/creator-${creatorId}/artworks/${filename}`,
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
  }

  private async crawlImage(artWorkUrl: string) {
    if (artWorkUrl.indexOf('imgur') > 0) {
      return this.crawlImgurImage(artWorkUrl + '.jpg');
    }

    if (artWorkUrl.indexOf('drive.google.com/file') > 0) {
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
          message: error.message,
        },
      };
    }
  }

  private async crawlImgurAlbum(url: string) {
    const api = this.configService.get<string>('imgur.api');
    const clientId = this.configService.get<string>('imgur.clientId');
    const albumHash = url.split('/')?.[4];
    try {
      const response = await axios.get(`${api}/3/album/${albumHash}/images`, {
        headers: {
          Authorization: `Client-ID ${clientId}`,
        },
      });

      return response.data?.data.map((data) => ({ id: data.id }));
    } catch (error) {
      return {
        errors: {
          message: error.message,
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
          message: error.message,
        },
      };
    }
  }

  private async crawlGoogleDriveFolder(url: string) {
    const folderId = url.split('/')?.[5];
    const files: any[] = [];
    try {
      const res: any = await this.googleService.files.list({
        q: `'${folderId}' in parents`,
        fields: 'nextPageToken, files(id, name)',
        spaces: 'drive',
      });

      files.push(res.files);

      res.data.files.forEach(function (file: any) {
        console.log('Found file:', file.name, file.id);
      });

      return res.data.files;
    } catch (error) {
      this.logger.error(`cannot get image from url: ${url}`);
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreatorService } from '../creator/creator.service';
import { FilesService } from '../files/files.service';
import { UserWalletService } from '../user-wallet/user-wallet.service';
import { AlbumGraphql } from './album.graphql';
import { CreateAlbumRequestDto } from './dto/create-album-request.dto';
import { QueryAlbumDto } from './dto/query-album-query.dto';

@Injectable()
export class AlbumService {
  private readonly logger = new Logger(AlbumService.name);

  constructor(
    private configService: ConfigService,
    private albumGraphql: AlbumGraphql,
    private fileService: FilesService,
    private userWalletService: UserWalletService,
    private creatorService: CreatorService
  ) {}

  async create(data: CreateAlbumRequestDto, files: Array<Express.Multer.File>) {
    try {
      const creatorId = await this.creatorService.getCreatorIdAuthToken();

      const { name, description, show } = data;
      // insert db
      const result = await this.albumGraphql.insert({
        object: {
          name,
          description,
          show,
          creator_id: creatorId,
        },
      });

      const albumId = result.data.insert_albums_one.id;

      let thumbnail_url = '';
      const artworks = [];
      const s3SubFolder =
        this.configService.get<string>('aws.s3SubFolder') || 'images';
      const s3Path = `${s3SubFolder}/creators/${creatorId}/albums/${albumId}`;

      // map files
      const uploadPromises = files.map((file) => {
        if (file.mimetype.includes('image')) {
          return this.fileService.uploadToS3(
            `${s3Path}/${file.fieldname}-${file.originalname}`,
            file.buffer,
            file.mimetype
          );
        }

        return undefined;
      });

      const uploadResult = await Promise.all(uploadPromises);
      files.forEach((file, index) => {
        // if have upload result
        if (uploadResult[index]) {
          // throw error if upload failed
          if (uploadResult[index].$metadata.httpStatusCode !== 200)
            throw new Error('Upload fail' + JSON.stringify(result));

          // build uploaded url
          const uploadedUrl = new URL(
            `${s3Path}/${file.fieldname}-${file.originalname}`,
            this.configService.get<string>('aws.queryEndpoint')
          ).href;

          switch (file.fieldname) {
            case 'thumbnail':
              thumbnail_url = uploadedUrl;
              break;
            case 'artworks':
              artworks.push(uploadedUrl);
              break;
            default:
              break;
          }
        }
      });

      // update
      if (thumbnail_url !== '') {
        const updateResult = await this.albumGraphql.update({
          id: albumId,
          data: {
            thumbnail_url,
          },
        });

        if (updateResult.errors) return updateResult;
      }

      const artworkData = artworks.map((artworkUrl) => ({
        album_id: albumId,
        url: artworkUrl,
        creator_id: creatorId,
      }));
      // insert
      const insertArtworksResult = await this.albumGraphql.insertArtworks({
        objects: artworkData,
      });

      if (insertArtworksResult.errors) return insertArtworksResult;
      return result;
    } catch (error) {
      return {
        errors: [
          {
            message: error.message,
          },
        ],
      };
    }
  }

  async getAll(query: QueryAlbumDto) {
    const creatorId = await this.creatorService.getCreatorIdAuthToken();
    const { limit, offset } = query;
    return this.albumGraphql.getListAlbum({
      creator_id: creatorId,
      limit,
      offset,
    });
  }

  async getDetail(id: number) {
    const creatorId = await this.creatorService.getCreatorIdAuthToken();
    return this.albumGraphql.albumDetail({
      id,
      creator_id: creatorId,
    });
  }
}

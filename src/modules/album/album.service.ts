import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreatorService } from '../creator/creator.service';
import { FilesService } from '../files/files.service';
import { UserWalletService } from '../user-wallet/user-wallet.service';
import { AlbumGraphql } from './album.graphql';
import { CreateAlbumRequestDto } from './dto/create-album-request.dto';
import { QueryAlbumDto } from './dto/query-album-query.dto';
import { UpdateAlbumRequestDto } from './dto/update-album-request.dto';
import { QueryAlbumPublicDto } from './dto/query-album-public-query.dto';

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

      if (result.errors) return result;

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
              artworks.push({
                url: uploadedUrl,
                name: file.originalname,
              });
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
          creator_id: creatorId,
          data: {
            thumbnail_url,
          },
        });

        if (updateResult.errors) return updateResult;
      }

      const artworkData = artworks.map((artwork) => ({
        album_id: albumId,
        url: artwork.url,
        name: artwork.name,
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
    const { name, limit, offset } = query;
    return this.albumGraphql.getListAlbum({
      creator_id: creatorId,
      name,
      limit: Number(limit),
      offset: Number(offset),
    });
  }

  async getAllPublicAlbum(query: QueryAlbumPublicDto) {
    const { creator_id, limit, offset } = query;

    const result = await this.albumGraphql.countArtworkInDefault({
      creator_id,
    });

    if (result.errors) return result;
    const count = result.data.artworks_aggregate.aggregate.count;

    if (count > 0)
      return this.albumGraphql.getPublicAlbumsWithDefaultAlbum({
        creator_id,
        limit,
        offset,
      });

    return this.albumGraphql.getPublicAlbums({
      creator_id,
      limit,
      offset,
    });
  }

  async getDetail(id: number) {
    const creatorId = await this.creatorService.getCreatorIdAuthToken();

    if (id === 1) {
      return this.albumGraphql.defaultAlbumDetail({
        id,
        creator_id: creatorId,
      });
    }
    return this.albumGraphql.albumDetail({
      id,
      creator_id: creatorId,
    });
  }

  async update(
    id: number,
    data: UpdateAlbumRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const { name, description } = data;
      let { show } = data;
      const creatorId = await this.creatorService.getCreatorIdAuthToken();

      const getAlbumResult = await this.getAlbumByPk(id);
      if (getAlbumResult.errors) return getAlbumResult;
      const albumCreatorId = getAlbumResult.data?.albums_by_pk?.creator_id;

      if (albumCreatorId !== creatorId)
        throw new ForbiddenException('invalid creator');

      const totalArtworks =
        getAlbumResult.data.albums_by_pk.artworks_aggregate.aggregate.count;
      if (Boolean(show) === true && Number(totalArtworks) === 0) show = 'false';

      let thumbnail_url = '';

      const s3SubFolder =
        this.configService.get<string>('aws.s3SubFolder') || 'images';
      const s3Path = `${s3SubFolder}/creators/${creatorId}/albums/${id}`;

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
            throw new Error('Upload fail' + JSON.stringify(uploadResult));

          // build uploaded url
          const uploadedUrl = new URL(
            `${s3Path}/${file.fieldname}-${file.originalname}`,
            this.configService.get<string>('aws.queryEndpoint')
          ).href;

          switch (file.fieldname) {
            case 'thumbnail':
              thumbnail_url = uploadedUrl;
              break;
            default:
              break;
          }
        }
      });

      const updateData = {
        name,
        description,
        show,
      };
      if (thumbnail_url !== '') updateData['thumbnail_url'] = thumbnail_url;

      // update
      const updateResult = await this.albumGraphql.update({
        id,
        creator_id: creatorId,
        data: updateData,
      });

      return updateResult;
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

  async delete(id: number) {
    try {
      const creatorId = await this.creatorService.getCreatorIdAuthToken();

      const getAlbumResult = await this.getAlbumByPk(id);
      if (getAlbumResult.errors) return getAlbumResult;
      const albumCreatorId = getAlbumResult.data?.albums_by_pk?.creator_id;

      if (albumCreatorId !== creatorId)
        throw new ForbiddenException('invalid creator');

      return this.albumGraphql.delete({
        id,
      });
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

  private async getAlbumByPk(id: number) {
    const result = await this.albumGraphql.albumByPk({
      id,
    });
    return result;
  }
}

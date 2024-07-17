import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreateLaunchpadRequestDto } from './dto/create-launchpad-request.dto';
import { ContextProvider } from '../../providers/contex.provider';
import { LaunchpadGraphql } from './launchpad.graphql';
import { FilesService } from '../files/files.service';
import { LaunchpadStatus } from '../../common/enum';
// import { mkdirp } from '../chapter/utils';
// import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
// import { writeFile } from 'fs/promises';
// import { IPFSService } from '../files/ipfs.service';
// import { IMetadata } from './interfaces/metadata';
// import { Readable } from 'stream';
import { EditDraftLaunchpadRequestDto } from './dto/edit-draft-launchpad-request.dto';
import { EditUnPublishLaunchpadRequestDto } from './dto/edit-unpublish-launchpad-request.dto';

@Injectable()
export class LaunchpadService {
  private readonly logger = new Logger(LaunchpadService.name);

  constructor(
    private configService: ConfigService,
    private launchpadGraphql: LaunchpadGraphql,
    private fileService: FilesService // private ipfsService: IPFSService
  ) {}

  private getKeyName = (file: Express.Multer.File, launchpadId: string) => {
    const s3SubFolder =
      this.configService.get<string>('aws.s3SubFolder') || 'images';
    return `${s3SubFolder}/launchpad-${launchpadId}/${file.fieldname}-${file.originalname}`;
  };

  async create(
    data: CreateLaunchpadRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      // const { userId, token } = ContextProvider.getAuthUser();

      const {
        name,
        name_in_vn,
        description,
        description_in_vn,
        seo_description,
        seo_description_in_vn,
        creator_id,
      } = data;

      // insert db
      const result = await this.launchpadGraphql.insert({
        data: {
          // name,
          // name_in_vn,
          // description,
          // description_in_vn,
          // seo_description,
          // seo_description_in_vn,
          creator_id,
          status: LaunchpadStatus.Draft,
        },
      });

      if (result.errors) return result;

      const launchpadId = result.data.insert_launchpad_one.id;

      let thumbnail_url = '';
      // let logo_url = '';
      let thumbnail_in_vn_url = '';
      const featured_images = [];

      // map files
      const uploadPromises = files.map((file) => {
        if (file.mimetype.includes('image')) {
          return this.fileService.uploadToS3(
            this.getKeyName(file, launchpadId),
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
            this.getKeyName(file, launchpadId),
            this.configService.get<string>('aws.queryEndpoint')
          ).href;

          switch (file.fieldname) {
            case 'thumbnail':
              thumbnail_url = uploadedUrl;
              break;
            case 'thumbnail_in_vn':
              thumbnail_in_vn_url = uploadedUrl;
              break;
            case 'featured_images':
              featured_images.push(uploadedUrl);
              break;
            default:
              break;
          }
        }
      });

      // update
      const updateResult = await this.launchpadGraphql.update({
        id: launchpadId,
        data: {
          // thumbnail_url,
          // logo_url,
          featured_images,
        },
      });

      if (updateResult.errors) return updateResult;

      const language_data_vn = {
        launchpad_id: launchpadId,
        language_id: 2,
        data: {
          name: name_in_vn,
          description: description_in_vn,
          seo_description: seo_description_in_vn,
          thumbnail_url: thumbnail_in_vn_url,
        },
      };

      const language_data_en = {
        launchpad_id: launchpadId,
        language_id: 1,
        data: {
          name,
          description,
          seo_description,
          thumbnail_url,
        },
      };
      const objects = [language_data_en, language_data_vn];
      // insert i18n
      const insertI18nResult = await this.launchpadGraphql.insertI18n({
        objects,
      });

      if (insertI18nResult.errors) return insertI18nResult;
      return result;
    } catch (error) {
      return {
        errors: [error],
      };
    }
  }

  async unpublish(launchpadId: number) {
    // Update offchain launchpad data
    const { token } = ContextProvider.getAuthUser();

    const launchpad = await this.getExistingLaunchpad(launchpadId);
    if (launchpad.status != LaunchpadStatus.Published)
      throw new ForbiddenException('invalid launchpad status');

    return this.launchpadGraphql.update({
      id: launchpadId,
      data: {
        status: LaunchpadStatus.Draft,
      },
    });
  }

  async publish(launchpadId: number) {
    // Update offchain launchpad data
    // const { token } = ContextProvider.getAuthUser();

    const launchpad = await this.getExistingLaunchpad(launchpadId);
    if (launchpad.status != LaunchpadStatus.Draft)
      throw new ForbiddenException('invalid launchpad status');

    return this.launchpadGraphql.update({
      id: launchpadId,
      data: {
        status: LaunchpadStatus.Published,
      },
    });
  }

  // async listOwnedLanchpad() {
  //   const { userId } = ContextProvider.getAuthUser();

  //   return this.launchpadGraphql.listOwnedLaunchpad({
  //     user_id: userId,
  //   });
  // }

  async launchpadDetail(launchpad_id: number, language_id: number) {
    // const { token } = ContextProvider.getAuthUser();
    return this.launchpadGraphql.getLaunchpadDetail(
      {
        launchpad_id,
        language_id,
      }
      // token
    );
  }

  async getListLaunchpad(
    language_id: number,
    limit: number,
    offset: number,
    status?: string[]
  ) {
    // const { token } = ContextProvider.getAuthUser();
    const variables: any = {
      language_id,
      limit,
      offset,
    };
    if (status && status.length > 0) {
      variables.status = status;
    }

    return this.launchpadGraphql.getListLaunchpad(
      variables
      // token
    );
  }

  /**
   * Admin can edit all field
   * @param launchpadId
   */
  async editDraftLaunchpad(
    launchpadId: number,
    data: EditDraftLaunchpadRequestDto,
    files: Array<Express.Multer.File>
  ) {
    // Update offchain launchpad data
    const { userId, token } = ContextProvider.getAuthUser();

    // check launchpad
    const launchpad = await this.getExistingLaunchpad(launchpadId);
    if (launchpad.status !== LaunchpadStatus.Draft)
      throw new BadRequestException('launchpad status invalid');
    if (launchpad.creator_id !== userId)
      throw new ForbiddenException('invalid creator');

    const {
      name,
      license_token_id,
      mint_price,
      // royalties,
      max_supply,
      max_mint_per_address,
      start_date,
      end_date,
      description,
      creator_address,
      thumbnail_url,
      featured_images_url,
      nft_images_url,
      license_token_address,
    } = data;

    let new_thumbnail_url = thumbnail_url;
    const featured_images_url_arr = featured_images_url
      .split(',')
      .map(String)
      .filter((url) => url !== '');
    const nft_images_url_arr = nft_images_url
      .split(',')
      .map(String)
      .filter((url) => url !== '');

    // map files
    const uploadPromises = files.map((file) => {
      if (file.mimetype.includes('image')) {
        return this.fileService.uploadToS3(
          this.getKeyName(file, launchpadId.toString()),
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
          this.getKeyName(file, launchpadId.toString()),
          this.configService.get<string>('aws.queryEndpoint')
        ).href;

        switch (file.fieldname) {
          case 'thumbnail':
            new_thumbnail_url = uploadedUrl;
            break;
          case 'featured_images':
            featured_images_url_arr.push(uploadedUrl);
            break;
          case 'nft_images':
            nft_images_url_arr.push(uploadedUrl);
            break;
          default:
            break;
        }
      }
    });

    // update db
    const result = await this.launchpadGraphql.update({
      id: launchpadId,
      data: {
        name,
        license_token_id,
        mint_price,
        // royalties,
        max_supply,
        max_mint_per_address,
        start_date,
        end_date,
        description,
        creator_address,
        // creator_id: userId,
        license_token_address,
        thumbnail_url: new_thumbnail_url,
        featured_images: featured_images_url_arr,
        nft_images: nft_images_url_arr,
      },
    });

    return result;
  }

  /**
   * Admin only can edit Description and Images (Thumbnail, logo, feature) fields
   * @param launchpadId
   */
  async editUnPublishLaunchpad(
    launchpadId: number,
    data: EditUnPublishLaunchpadRequestDto,
    files: Array<Express.Multer.File>
  ) {
    // Update offchain launchpad data
    const { userId, token } = ContextProvider.getAuthUser();

    // check launchpad
    const launchpad = await this.getExistingLaunchpad(launchpadId);
    if (launchpad.status !== LaunchpadStatus.ReadyToMint)
      throw new BadRequestException('launchpad status invalid');
    if (launchpad.creator_id !== userId)
      throw new ForbiddenException('invalid creator');

    const { description, thumbnail_url, featured_images_url } = data;

    let new_thumbnail_url = thumbnail_url;
    const featured_images_url_arr = featured_images_url.split(',').map(String);

    // map files
    const uploadPromises = files.map((file) => {
      if (file.mimetype.includes('image')) {
        return this.fileService.uploadToS3(
          this.getKeyName(file, launchpadId.toString()),
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
          this.getKeyName(file, launchpadId.toString()),
          this.configService.get<string>('aws.queryEndpoint')
        ).href;

        switch (file.fieldname) {
          case 'thumbnail':
            new_thumbnail_url = uploadedUrl;
            break;
          case 'featured_images':
            featured_images_url_arr.push(uploadedUrl);
            break;
          default:
            break;
        }
      }
    });

    // update db
    const result = await this.launchpadGraphql.update({
      id: launchpadId,
      data: {
        description,
        thumbnail_url: new_thumbnail_url,
        featured_images: featured_images_url_arr,
      },
    });

    return result;
  }

  private async getExistingLaunchpad(launchpadId: number) {
    const result = await this.launchpadGraphql.queryByPk({
      id: launchpadId,
    });
    if (result.errors) throw new Error(JSON.stringify(result));

    const launchpad = result.data.launchpad_by_pk;
    if (!launchpad) throw new NotFoundException('launchpad not found');

    return launchpad;
  }
}

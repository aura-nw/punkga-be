import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ContextProvider } from '../../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { BannerGraphql } from './banner.graphql';
import { CreateBannerDto } from './dto/create-banner.dto';
import { BannerLanguagesDto, UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannerService {
  private readonly logger = new Logger(BannerService.name);

  constructor(
    private configService: ConfigService,
    private bannerGraphql: BannerGraphql,
    private fileService: FilesService
  ) {}

  async create(data: CreateBannerDto, files: Array<Express.Multer.File>) {
    const { token } = ContextProvider.getAuthUser();

    const { target, status } = data;

    // map files
    const uploadPromises = files.map((file) => {
      if (file.mimetype.includes('image')) {
        return this.fileService.uploadToS3(
          this.fileService.getKeyName(file, 'banner'),
          file.buffer,
          file.mimetype
        );
      }

      return undefined;
    });
    const uploadResult = await Promise.all(uploadPromises);
    let vn_image_url = '';
    let en_image_url = '';

    files.forEach((file, index) => {
      // if have upload result
      if (uploadResult[index]) {
        // throw error if upload failed
        if (uploadResult[index].$metadata.httpStatusCode !== 200)
          throw new Error('Upload fail' + JSON.stringify(result));

        // build uploaded url
        const uploadedUrl = new URL(
          this.fileService.getKeyName(file, 'banner'),
          this.configService.get<string>('aws.queryEndpoint')
        ).href;

        switch (file.fieldname) {
          case 'vn_image':
            vn_image_url = uploadedUrl;
            break;
          case 'en_image':
            en_image_url = uploadedUrl;
            break;
          default:
            break;
        }
      }
    });
    // insert db
    const result = await this.bannerGraphql.createBanner(
      {
        objects: {
          status,
          target,
          banners_i18ns: {
            data: [
              {
                language_id: 1,
                data: {
                  image_url: en_image_url || vn_image_url,
                },
              },
              {
                language_id: 2,
                data: {
                  image_url: vn_image_url || en_image_url,
                },
              },
            ],
          },
        },
      },
      token
    );

    return result;
  }

  async update(
    bannerId: number,
    data: UpdateBannerDto,
    files: Array<Express.Multer.File>
  ) {
    const { token } = ContextProvider.getAuthUser();
    const { order, status, target, i18n } = data;

    // map files
    const uploadPromises = files.map((file) => {
      if (file.mimetype.includes('image')) {
        return this.fileService.uploadToS3(
          this.fileService.getKeyName(file, 'banner'),
          file.buffer,
          file.mimetype
        );
      }

      return undefined;
    });
    const uploadResult = await Promise.all(uploadPromises);
    let vn_image_url: string;
    let en_image_url: string;

    files.forEach((file, index) => {
      // if have upload result
      if (uploadResult[index]) {
        // throw error if upload failed
        if (uploadResult[index].$metadata.httpStatusCode !== 200)
          throw new Error('Upload fail' + JSON.stringify(result));

        // build uploaded url
        const uploadedUrl = new URL(
          this.fileService.getKeyName(file, 'banner'),
          this.configService.get<string>('aws.queryEndpoint')
        ).href;

        switch (file.fieldname) {
          case 'vn_image':
            vn_image_url = uploadedUrl;
            break;
          case 'en_image':
            en_image_url = uploadedUrl;
            break;
          default:
            break;
        }
      }
    });

    const i18nObject = JSON.parse(i18n) as BannerLanguagesDto;

    // insert db
    const result = await this.bannerGraphql.createBanner(
      {
        objects: {
          id: bannerId,
          order,
          status,
          target,
          banners_i18ns: {
            data: [
              {
                language_id: 1,
                data: {
                  image_url:
                    en_image_url ||
                    i18nObject.banner_languages.find(
                      (data) => data.language_id === 1
                    ).image_url,
                },
              },
              {
                language_id: 2,
                data: {
                  image_url:
                    vn_image_url ||
                    i18nObject.banner_languages.find(
                      (data) => data.language_id === 2
                    ).image_url,
                },
              },
            ],
          },
        },
        on_conflict: {
          constraint: 'banners_pkey',
          update_columns: ['order', 'status', 'target', 'updated_at'],
        },
      },
      token
    );

    return result;
  }
}


import { Injectable, Logger, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreateLaunchpadRequestDto } from './dto/create-launchpad-request.dto';
import { ContextProvider } from '../../providers/contex.provider';
import { LaunchpadGraphql } from './launchpad.graphql';
import { FilesService } from '../files/files.service';
import { LaunchpadStatus } from '../../common/enum';

@Injectable()
export class LaunchpadService {
  private readonly logger = new Logger(LaunchpadService.name);

  constructor(
    private configService: ConfigService,
    private launchpadGraphql: LaunchpadGraphql,
    private fileService: FilesService,
  ) { }

  private getKeyName = (file: Express.Multer.File, launchpadId: string) => {
    const s3SubFolder =
      this.configService.get<string>('aws.s3SubFolder') || 'images';
    return `${s3SubFolder}/launchpad-${launchpadId}/${file.fieldname}-${file.originalname}`;
  }

  async create(
    data: CreateLaunchpadRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const { userId, token } = ContextProvider.getAuthUser();
      const {
        name,
        license_token_id,
        mint_price,
        royalties,
        max_supply,
        max_mint_per_address,
        start_date,
        end_date,
        description,
        creator_address
      } = data;

      // insert db
      const result = await this.launchpadGraphql.insert({
        data: {
          name,
          license_token_id,
          mint_price,
          royalties,
          max_supply,
          max_mint_per_address,
          start_date,
          end_date,
          description,
          creator_address,
          creator_id: userId,
          status: LaunchpadStatus.Draft
        }
      });

      if (result.errors) return result;

      const launchpadId = result.data.insert_launchpad_one.id;

      let thumbnail_url = '';
      let logo_url = '';
      const featured_images = [];
      const nft_images = [];

      // map files
      const uploadPromises = files.map((file) => {
        if (file.mimetype.includes('image')) {
          return this.fileService.uploadToS3(this.getKeyName(file, launchpadId), file.buffer, file.mimetype);
        }

        return undefined;
      });

      const uploadResult = await Promise.all(uploadPromises);
      files.forEach((file, index) => {
        // if have upload result
        if (uploadResult[index]) {
          // throw error if upload failed
          if (uploadResult[index].$metadata.httpStatusCode !== 200)
            throw new Error('Upload thumbnail fail' + JSON.stringify(result));

          // build uploaded url
          const uploadedUrl = new URL(this.getKeyName(file, launchpadId), this.configService.get<string>('aws.queryEndpoint'))
            .href;

          switch (file.fieldname) {
            case 'thumbnail':
              thumbnail_url = uploadedUrl
              break;
            case 'logo':
              logo_url = uploadedUrl;
              break;
            case 'featured_images':
              featured_images.push(uploadedUrl)
              break;
            case 'nft_images':
              nft_images.push(uploadedUrl)
              break;
            default:
              break;
          }
        }
      });

      // update
      const updateResult = await this.launchpadGraphql.update(
        {
          id: launchpadId,
          data: {
            thumbnail_url,
            logo_url,
            featured_images,
            nft_images,
          }
        }
      );

      if (updateResult.errors)
        return updateResult;

      return result;
    }
    catch (error) {
      return {
        errors: [error],
      };
    }
  }

  async deploy(launchpadId: number) {
    // Get launchpad info
    const launchpad = 

    // Upload images to IPFS

    // Create erc20 drop

    // Update offchain data
  }

  async publish(launchpadId: number) {
    // Update offchain launchpad data
  }

  async edit(launchpadId: number) {
    // Update offchain launchpad data
  }
}
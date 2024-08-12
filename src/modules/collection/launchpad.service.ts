import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreateLaunchpadRequestDto } from './dto/create-launchpad-request.dto';
import { ContextProvider } from '../../providers/contex.provider';
import { LaunchpadGraphql } from './launchpad.graphql';
import { FilesService } from '../files/files.service';
import { LaunchpadStatus } from '../../common/enum';
import { generateSlug } from '../manga/util';
import { EditDraftLaunchpadRequestDto } from './dto/edit-draft-launchpad-request.dto';
import { UserWalletService } from '../user-wallet/user-wallet.service';
import { ethers } from 'ethers';

@Injectable()
export class LaunchpadService {
  private readonly logger = new Logger(LaunchpadService.name);

  constructor(
    private configService: ConfigService,
    private launchpadGraphql: LaunchpadGraphql,
    private fileService: FilesService, // private ipfsService: IPFSService
    private userWalletService: UserWalletService
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
        fund,
        contract_address,
      } = data;
      const relate_key_words = [name, name_in_vn];
      // insert db
      const result = await this.launchpadGraphql.insert({
        data: {
          creator_id,
          status: LaunchpadStatus.Draft,
          fund,
          contract_address,
          relate_key_words,
        },
      });
      const mangaId = result.data.insert_launchpad_one.id;
      const slug = generateSlug(name,mangaId);
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
          slug,
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

  async launchpadDetail(launchpad_id: number) {
    // const { token } = ContextProvider.getAuthUser();
    return this.launchpadGraphql.queryByPk(
      {
        id: launchpad_id,
      }
      // token
    );
  }

  async launchpadDetailBySlug(launchpad_slug: string) {
    // const { token } = ContextProvider.getAuthUser();
    return this.launchpadGraphql.queryBySlug(
      {
        slug: launchpad_slug,
      }
      // token
    );
  }

  async launchpadLanguageDetail(launchpad_id: number, language_id: number) {
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
    limit: number,
    offset: number,
    status?: string[],
    keyword?: string
  ) {
    // const { token } = ContextProvider.getAuthUser();
    const variables: any = {
      limit,
      offset,
    };
    if (status && status.length > 0) {
      variables.status = status;
    }
    if (keyword) {
      variables.keyword = `%${keyword}%`;
    }

    return this.launchpadGraphql.getListLaunchpad(
      variables
      // token
    );
  }

  /**
   * Admin can edit all field
   * @param
   */
  async editDraftLaunchpad(
    data: EditDraftLaunchpadRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      // const { userId, token } = ContextProvider.getAuthUser();

      const {
        launchpad_id,
        name,
        name_in_vn,
        description,
        description_in_vn,
        seo_description,
        seo_description_in_vn,
        creator_id,
        fund,
        contract_address,
      } = data;

      const launchpad = await this.getExistingLaunchpad(launchpad_id);
      if (launchpad.status != LaunchpadStatus.Draft) {
        throw new BadRequestException('Launchpad status must be Draft');
      }

      let thumbnail_url = '';
      // let logo_url = '';
      let thumbnail_in_vn_url = '';
      const featured_images = [];

      // map files
      const uploadPromises = files.map((file) => {
        if (file.mimetype.includes('image')) {
          return this.fileService.uploadToS3(
            this.getKeyName(file, launchpad_id.toString()),
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
            this.getKeyName(file, launchpad_id.toString()),
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
        id: launchpad_id,
        data: {
          creator_id,
          fund,
          contract_address,
          featured_images,
        },
      });

      if (updateResult.errors) return updateResult;

      const language_data_vn = {
        launchpad_id,
        language_id: 2,
        data: {
          name: name_in_vn,
          description: description_in_vn,
          seo_description: seo_description_in_vn,
          thumbnail_url: thumbnail_in_vn_url,
        },
      };

      const language_data_en = {
        launchpad_id,
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
      return updateResult;
    } catch (error) {
      return {
        errors: [error],
      };
    }
  }

  async mintNFT(launchpadId: number, nftAmount: number) {
    // Update offchain launchpad data

    const { userId } = ContextProvider.getAuthUser();
    const launchpad = await this.getExistingLaunchpad(launchpadId);
    if (launchpad.status != LaunchpadStatus.Published) {
      throw new BadRequestException('Launchpad status must be Published!');
    }
    const userWallet = await this.userWalletService.deserialize(userId);
    if (!userWallet) {
      throw new BadRequestException('Can not get user wallet!');
    }
    const launchpadContract = await this.userWalletService.getLaunchpadContract(
      userWallet.wallet,
      launchpad.contract_address
    );
    const fund = nftAmount * launchpad.fund;
    try {
      const tx = await launchpadContract.purchase(nftAmount, {
        value: ethers.parseEther(fund.toString()).toString(),
      });
      const result = await tx.wait();
      // console.log(result.hash);
      return result;
    } catch (err) {
      throw new InternalServerErrorException(JSON.stringify(err));
    }
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

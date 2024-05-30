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
import { mkdirp } from '../chapter/utils';
import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { writeFile } from 'fs/promises';
import { IPFSService } from '../files/ipfs.service';
import { IMetadata } from './interfaces/metadata';
import { Readable } from 'stream';
import { EditDraftLaunchpadRequestDto } from './dto/edit-draft-launchpad-request.dto';
import { EditUnPublishLaunchpadRequestDto } from './dto/edit-unpublish-launchpad-request.dto';

@Injectable()
export class LaunchpadService {
  private readonly logger = new Logger(LaunchpadService.name);

  constructor(
    private configService: ConfigService,
    private launchpadGraphql: LaunchpadGraphql,
    private fileService: FilesService,
    private ipfsService: IPFSService
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
      const { userId, token } = ContextProvider.getAuthUser();

      const {
        name,
        license_token_id,
        license_token_address,
        mint_price,
        royalties,
        max_supply,
        max_mint_per_address,
        start_date,
        end_date,
        description,
        creator_address,
      } = data;

      // insert db
      const result = await this.launchpadGraphql.insert({
        data: {
          name,
          license_token_id,
          license_token_address,
          mint_price,
          royalties,
          max_supply,
          max_mint_per_address,
          start_date,
          end_date,
          description,
          creator_address,
          creator_id: userId,
          status: LaunchpadStatus.Draft,
        },
      });

      if (result.errors) return result;

      const launchpadId = result.data.insert_launchpad_one.id;

      let thumbnail_url = '';
      // let logo_url = '';
      const featured_images = [];
      const nft_images = [];

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
            // case 'logo':
            //   logo_url = uploadedUrl;
            //   break;
            case 'featured_images':
              featured_images.push(uploadedUrl);
              break;
            case 'nft_images':
              nft_images.push(uploadedUrl);
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
          thumbnail_url,
          // logo_url,
          featured_images,
          nft_images,
        },
      });

      if (updateResult.errors) return updateResult;

      return result;
    } catch (error) {
      return {
        errors: [error],
      };
    }
  }

  async preDeploy(launchpadId: number) {
    const { userId, token } = ContextProvider.getAuthUser();

    // Get launchpad info
    const launchpad = await this.getExistingLaunchpad(launchpadId, token);
    if (launchpad.status === LaunchpadStatus.Draft) {
      // Upload nft images to IPFS
      //   - fetch nft images from s3
      const nftImages = launchpad.nft_images;
      if (nftImages.length === 0) throw new Error('NFT images empty!');

      const filePromises: Promise<GetObjectCommandOutput>[] = nftImages.map(
        (nftImageUrl: string) => {
          // remove / from pathname
          const keyName = new URL(nftImageUrl).pathname.substring(1);
          return this.fileService.downloadFromS3(keyName);
        }
      );

      const files = await Promise.all(filePromises);
      const convertedDataFiles = await Promise.all(
        files.map((file) => ({
          body: file.Body as Readable,
        }))
      );
      //    - write files to folder
      const folderPath = `./uploads/launchpad-${launchpadId}`;
      mkdirp(folderPath);
      convertedDataFiles.map(async (data, index) => {
        const tokenId = 1370000000000 + index;
        const localFilePath = `${folderPath}/${tokenId}`;
        return writeFile(localFilePath, data.body);
      });
      //   - upload nft images folder to ipfs
      const ipfsImageFolder = `/punkga-launchpad-${launchpadId}/images`;
      const { cid, filenames } = await this.ipfsService.uploadLocalFolderToIpfs(
        folderPath,
        ipfsImageFolder
      );

      //   - make & upload nft metadata
      const ipfsMetadataFolder = `/punkga-launchpad-${launchpadId}/metadata`;
      const metadataObjects: IMetadata[] = filenames.map(
        (filename, index: number) => ({
          token_id: 1370000000000 + index,
          name: (1370000000000 + index).toString(),
          description: 'punkga nft',
          attributes: [],
          image: `https://ipfs-gw.dev.aura.network/ipfs/${cid}/${
            1370000000000 + index
          }`,
        })
      );
      const medatadaFolderCid =
        await this.ipfsService.uploadMetadataObjectsToIpfs(
          metadataObjects,
          ipfsMetadataFolder
        );
      const metadataIpfsLink = `https://ipfs-gw.dev.aura.network/ipfs/${medatadaFolderCid}`;
      console.log(`\n\nUploaded metadata. Link: ${metadataIpfsLink}`);

      //   - upload metadata contract uri
      const metadataContract = {
        name: launchpad.name,
        image_url: launchpad.thumbnail_url,
        banner_image_url: launchpad.thumbnail_url,
        description: launchpad.description,
        website: 'https://punkga.me',
      };
      const metadataContractFolderPath = `/punkga-launchpad-${launchpadId}`;
      const metadataContractCid =
        await this.ipfsService.uploadMetadataContractToIpfs(
          metadataContract,
          metadataContractFolderPath
        );
      const metadataContractIpfsLink = `https://ipfs-gw.dev.aura.network/ipfs/${metadataContractCid}`;
      launchpad.metadata_uri_base = metadataIpfsLink;
      launchpad.metadata_contract_uri = metadataContractIpfsLink;
      launchpad.status = LaunchpadStatus.ReadyToMint;

      // Create erc20 drop
      // -> FRONTEND Call

      // Update offchain data
      const updateResult = await this.launchpadGraphql.update({
        id: launchpadId,
        data: {
          metadata_uri_base: metadataIpfsLink,
          metadata_contract_uri: metadataContractIpfsLink,
        },
      });
      if (updateResult.errors) return updateResult;
    }

    // query creator address
    const queryUserResult = await this.launchpadGraphql.queryCreatorAddress({
      id: userId,
    });
    if (queryUserResult.errors) return queryUserResult;
    const creatorAddress =
      queryUserResult.data.authorizer_users_by_pk.wallet_address;

    // return
    return {
      name: launchpad.name,
      symbol: `PL${launchpadId}`,
      defaultAdmin: creatorAddress,
      editionSize: launchpad.max_supply,
      royaltyBPS: 0,
      fundsRecipient: creatorAddress,
      saleConfig: {
        publicSale: {
          startTime: new Date(launchpad.start_date).getTime(),
          endTime: new Date(launchpad.end_date).getTime(),
          publicSalePrice: launchpad.mint_price,
          maxSalePurchasePerAddress: launchpad.max_mint_per_address,
        },
      },
      metadataURIBase: launchpad.metadata_uri_base,
      metadataContractURI: launchpad.metadata_contract_uri,
    };
  }

  async postDeploy(launchpadId: number, txHash: string) {
    const { token } = ContextProvider.getAuthUser();

    const launchpad = await this.getExistingLaunchpad(launchpadId, token);
    if (launchpad.status != LaunchpadStatus.Draft)
      throw new ForbiddenException('invalid launchpad status');

    return this.launchpadGraphql.update({
      id: launchpadId,
      data: {
        status: LaunchpadStatus.ReadyToMint,
        tx_hash: txHash,
      },
    });
  }

  async unpublish(launchpadId: number) {
    // Update offchain launchpad data
    const { token } = ContextProvider.getAuthUser();

    const launchpad = await this.getExistingLaunchpad(launchpadId, token);
    if (launchpad.status != LaunchpadStatus.Published)
      throw new ForbiddenException('invalid launchpad status');

    return this.launchpadGraphql.update({
      id: launchpadId,
      data: {
        status: LaunchpadStatus.ReadyToMint,
      },
    });
  }

  async publish(launchpadId: number) {
    // Update offchain launchpad data
    const { token } = ContextProvider.getAuthUser();

    const launchpad = await this.getExistingLaunchpad(launchpadId, token);
    if (launchpad.status != LaunchpadStatus.ReadyToMint)
      throw new ForbiddenException('invalid launchpad status');

    return this.launchpadGraphql.update({
      id: launchpadId,
      data: {
        status: LaunchpadStatus.Published,
      },
    });
  }

  async listOwnedLanchpad() {
    const { userId } = ContextProvider.getAuthUser();

    return this.launchpadGraphql.listOwnedLaunchpad({
      user_id: userId,
    });
  }

  async launchpadDetail(id: number) {
    const { token } = ContextProvider.getAuthUser();
    return this.launchpadGraphql.getOwnedLaunchpadDetail(
      {
        id,
      },
      token
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
    const launchpad = await this.getExistingLaunchpad(launchpadId, token);
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
    const launchpad = await this.getExistingLaunchpad(launchpadId, token);
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

  private async getExistingLaunchpad(launchpadId: number, token: string) {
    const result = await this.launchpadGraphql.queryByPk(
      {
        id: launchpadId,
      },
      token
    );
    if (result.errors) throw new Error(JSON.stringify(result));

    const launchpad = result.data.launchpad_by_pk;
    if (!launchpad) throw new NotFoundException('launchpad not found');

    return launchpad;
  }
}

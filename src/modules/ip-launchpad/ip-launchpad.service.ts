import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreateIPLaunchpadRequestDto } from './dto/create-ip-launchpad-request.dto';
import { ContextProvider } from '../../providers/contex.provider';
import { IPLaunchpadGraphql } from './ip-launchpad.graphql';
import { FilesService } from '../files/files.service';
import { LaunchpadStatus } from '../../common/enum';
import { mkdirp } from '../chapter/utils';
import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { writeFile } from 'fs/promises';
import { IMetadata } from './interfaces/metadata';
import { Readable } from 'stream';
import { EditDraftIpLaunchpadRequestDto } from './dto/edit-draft-launchpad-request.dto';
import { EditUnPublishIpLaunchpadRequestDto } from './dto/edit-unpublish-launchpad-request.dto';
import { IPFSService } from '../files/ipfs.service';

@Injectable()
export class IPLaunchpadService {
  private readonly logger = new Logger(IPLaunchpadService.name);

  constructor(
    private configService: ConfigService,
    private iplaunchpadGraphql: IPLaunchpadGraphql,
    private fileService: FilesService,
    private ipfsService: IPFSService
  ) {}

  private getKeyName = (file: Express.Multer.File, iplaunchpadId: string) => {
    const s3SubFolder =
      this.configService.get<string>('aws.s3SubFolder') || 'images';
    return `${s3SubFolder}/ip-launchpad-${iplaunchpadId}/${file.fieldname}-${file.originalname}`;
  };

  async create(
    data: CreateIPLaunchpadRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const { userId } = ContextProvider.getAuthUser();

      const {
        name,
        // license_token_id,
        // license_token_address,
        mint_price,
        royalties,
        max_supply,
        max_mint_per_address,
        start_date,
        end_date,
        description,
        creator_address,
        license_info,
      } = data;

      // insert db
      const result = await this.iplaunchpadGraphql.insert({
        data: {
          name,
          // license_token_id,
          // license_token_address,
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
          license_info: JSON.parse(license_info),
        },
      });

      if (result.errors) return result;

      const iplaunchpadId = result.data.insert_ip_launchpad_one.id;

      let thumbnail_url = '';
      // let logo_url = '';
      const featured_images = [];
      const nft_images = [];

      // map files
      const uploadPromises = files.map((file) => {
        if (file.mimetype.includes('image')) {
          return this.fileService.uploadToS3(
            this.getKeyName(file, iplaunchpadId),
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
            this.getKeyName(file, iplaunchpadId),
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
      const updateResult = await this.iplaunchpadGraphql.update({
        id: iplaunchpadId,
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

  async preDeploy(iplaunchpadId: number) {
    const { userId, token } = ContextProvider.getAuthUser();

    // Get iplaunchpad info
    const iplaunchpad = await this.getExistingIPLaunchpad(iplaunchpadId, token);
    if (iplaunchpad.status === LaunchpadStatus.Draft) {
      // Upload nft images to IPFS
      //   - fetch nft images from s3
      const nftImages = iplaunchpad.nft_images;
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
      const folderPath = `./uploads/iplaunchpad-${iplaunchpadId}`;
      mkdirp(folderPath);
      convertedDataFiles.map(async (data, index) => {
        const tokenId = 1370000000000 + index;
        const localFilePath = `${folderPath}/${tokenId}`;
        return writeFile(localFilePath, data.body);
      });
      //   - upload nft images folder to ipfs
      const ipfsImageFolder = `/punkga-iplaunchpad-${iplaunchpadId}/images`;
      const { cid, filenames } = await this.ipfsService.uploadLocalFolderToIpfs(
        folderPath,
        ipfsImageFolder
      );

      //   - make & upload nft metadata
      const ipfsMetadataFolder = `/punkga-iplaunchpad-${iplaunchpadId}/metadata`;
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
        name: iplaunchpad.name,
        image_url: iplaunchpad.thumbnail_url,
        banner_image_url: iplaunchpad.thumbnail_url,
        description: iplaunchpad.description,
        website: 'https://punkga.me',
      };
      const metadataContractFolderPath = `/punkga-iplaunchpad-${iplaunchpadId}`;
      const metadataContractCid =
        await this.ipfsService.uploadMetadataContractToIpfs(
          metadataContract,
          metadataContractFolderPath
        );
      const metadataContractIpfsLink = `https://ipfs-gw.dev.aura.network/ipfs/${metadataContractCid}`;
      iplaunchpad.metadata_uri_base = metadataIpfsLink;
      iplaunchpad.metadata_contract_uri = metadataContractIpfsLink;
      iplaunchpad.status = LaunchpadStatus.ReadyToMint;

      // Create erc20 drop
      // -> FRONTEND Call

      // Update offchain data
      const updateResult = await this.iplaunchpadGraphql.update({
        id: iplaunchpadId,
        data: {
          metadata_uri_base: metadataIpfsLink,
          metadata_contract_uri: metadataContractIpfsLink,
        },
      });
      if (updateResult.errors) return updateResult;
    }

    // query creator address
    const queryUserResult = await this.iplaunchpadGraphql.queryCreatorAddress({
      id: userId,
    });
    if (queryUserResult.errors) return queryUserResult;
    const creatorAddress =
      queryUserResult.data.authorizer_users_by_pk.wallet_address;

    // return
    return {
      name: iplaunchpad.name,
      symbol: `PL${iplaunchpadId}`,
      defaultAdmin: creatorAddress,
      editionSize: iplaunchpad.max_supply,
      royaltyBPS: 0,
      fundsRecipient: creatorAddress,
      saleConfig: {
        publicSale: {
          startTime: new Date(iplaunchpad.start_date).getTime(),
          endTime: new Date(iplaunchpad.end_date).getTime(),
          publicSalePrice: iplaunchpad.mint_price,
          maxSalePurchasePerAddress: iplaunchpad.max_mint_per_address,
        },
      },
      metadataURIBase: iplaunchpad.metadata_uri_base,
      metadataContractURI: iplaunchpad.metadata_contract_uri,
    };
  }

  async postDeploy(iplaunchpadId: number, txHash: string) {
    const { token } = ContextProvider.getAuthUser();

    const iplaunchpad = await this.getExistingIPLaunchpad(iplaunchpadId, token);
    if (iplaunchpad.status != LaunchpadStatus.Draft)
      throw new ForbiddenException('invalid iplaunchpad status');

    return this.iplaunchpadGraphql.update({
      id: iplaunchpadId,
      data: {
        status: LaunchpadStatus.ReadyToMint,
        tx_hash: txHash,
      },
    });
  }

  async unpublish(iplaunchpadId: number) {
    // Update offchain launchpad data
    const { token } = ContextProvider.getAuthUser();

    const iplaunchpad = await this.getExistingIPLaunchpad(iplaunchpadId, token);
    if (iplaunchpad.status != LaunchpadStatus.Published)
      throw new ForbiddenException('invalid iplaunchpad status');

    return this.iplaunchpadGraphql.update({
      id: iplaunchpadId,
      data: {
        status: LaunchpadStatus.ReadyToMint,
      },
    });
  }

  async publish(iplaunchpadId: number) {
    // Update offchain launchpad data
    const { token } = ContextProvider.getAuthUser();

    const iplaunchpad = await this.getExistingIPLaunchpad(iplaunchpadId, token);
    if (iplaunchpad.status != LaunchpadStatus.ReadyToMint)
      throw new ForbiddenException('invalid launchpad status');

    return this.iplaunchpadGraphql.update({
      id: iplaunchpadId,
      data: {
        status: LaunchpadStatus.Published,
      },
    });
  }

  async listOwnedIpLaunchpad() {
    const { userId } = ContextProvider.getAuthUser();

    return this.iplaunchpadGraphql.listOwnedIpLaunchpad({
      user_id: userId,
    });
  }

  async iplaunchpadDetail(id: number) {
    const { token } = ContextProvider.getAuthUser();
    return this.iplaunchpadGraphql.getOwnedIpLaunchpadDetail(
      {
        id,
      },
      token
    );
  }

  /**
   * Admin can edit all field
   * @param iplaunchpadId
   */
  async editDraftIpLaunchpad(
    iplaunchpadId: number,
    data: EditDraftIpLaunchpadRequestDto,
    files: Array<Express.Multer.File>
  ) {
    // Update offchain ip launchpad data
    const { userId, token } = ContextProvider.getAuthUser();

    // check launchpad
    const iplaunchpad = await this.getExistingIPLaunchpad(iplaunchpadId, token);
    if (iplaunchpad.status !== LaunchpadStatus.Draft)
      throw new BadRequestException('ip launchpad status invalid');
    if (iplaunchpad.creator_id !== userId)
      throw new ForbiddenException('invalid creator');

    const {
      name,
      // license_token_id,
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
      // license_token_address,
      license_info,
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
          this.getKeyName(file, iplaunchpadId.toString()),
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
          this.getKeyName(file, iplaunchpadId.toString()),
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
    const result = await this.iplaunchpadGraphql.update({
      id: iplaunchpadId,
      data: {
        name,
        // license_token_id,
        mint_price,
        // royalties,
        max_supply,
        max_mint_per_address,
        start_date,
        end_date,
        description,
        creator_address,
        // creator_id: userId,
        // license_token_address,
        thumbnail_url: new_thumbnail_url,
        featured_images: featured_images_url_arr,
        nft_images: nft_images_url_arr,
        license_info: JSON.parse(license_info),
      },
    });

    return result;
  }

  /**
   * Admin only can edit Description and Images (Thumbnail, logo, feature) fields
   * @param iplaunchpadId
   */
  async editUnPublishIpLaunchpad(
    iplaunchpadId: number,
    data: EditUnPublishIpLaunchpadRequestDto,
    files: Array<Express.Multer.File>
  ) {
    // Update offchain ip launchpad data
    const { userId, token } = ContextProvider.getAuthUser();

    // check ip launchpad
    const iplaunchpad = await this.getExistingIPLaunchpad(iplaunchpadId, token);
    if (iplaunchpad.status !== LaunchpadStatus.ReadyToMint)
      throw new BadRequestException('ip launchpad status invalid');
    if (iplaunchpad.creator_id !== userId)
      throw new ForbiddenException('invalid creator');

    const { description, thumbnail_url, featured_images_url } = data;

    let new_thumbnail_url = thumbnail_url;
    const featured_images_url_arr = featured_images_url.split(',').map(String);

    // map files
    const uploadPromises = files.map((file) => {
      if (file.mimetype.includes('image')) {
        return this.fileService.uploadToS3(
          this.getKeyName(file, iplaunchpadId.toString()),
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
          this.getKeyName(file, iplaunchpadId.toString()),
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
    const result = await this.iplaunchpadGraphql.update({
      id: iplaunchpadId,
      data: {
        description,
        thumbnail_url: new_thumbnail_url,
        featured_images: featured_images_url_arr,
      },
    });

    return result;
  }

  private async getExistingIPLaunchpad(iplaunchpadId: number, token: string) {
    const result = await this.iplaunchpadGraphql.queryByPk(
      {
        id: iplaunchpadId,
      },
      token
    );
    if (result.errors) throw new Error(JSON.stringify(result));

    const iplaunchpad = result.data.ip_launchpad_by_pk;
    if (!iplaunchpad) throw new NotFoundException('ip launchpad not found');

    return iplaunchpad;
  }
}

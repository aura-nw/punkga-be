
import { Injectable, Logger, } from '@nestjs/common';
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


@Injectable()
export class LaunchpadService {
  private readonly logger = new Logger(LaunchpadService.name);

  constructor(
    private configService: ConfigService,
    private launchpadGraphql: LaunchpadGraphql,
    private fileService: FilesService,
    private ipfsService: IPFSService,
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
    const { userId, token } = ContextProvider.getAuthUser();

    // Get launchpad info
    const result = await this.launchpadGraphql.queryByPk({
      id: launchpadId
    },
      token
    )
    if (result.errors) return result;
    const launchpad = result.data.launchpad_by_pk;

    if (launchpad.status === LaunchpadStatus.Draft) {

      // Upload nft images to IPFS
      //   - fetch nft images from s3
      const nftImages = launchpad.nft_images;
      if (nftImages.length === 0) throw new Error('NFT images empty!')

      const filePromises: Promise<GetObjectCommandOutput>[] = nftImages.map((nftImageUrl: string) => {
        // remove / from pathname
        const keyName = new URL(nftImageUrl).pathname.substring(1);
        return this.fileService.downloadFromS3(keyName)
      })

      const files = await Promise.all(filePromises);
      const convertedDataFiles = await Promise.all(files.map((file) => (file.Body as Readable)));
      //    - write files to folder
      const folderPath = `./uploads/launchpad-${launchpadId}`
      mkdirp(folderPath);
      convertedDataFiles.map(async (data, index) => {
        const localFilePath = `${folderPath}/${index}`;
        return writeFile(localFilePath, data)
      })
      //   - upload nft images folder to ipfs
      const ipfsImageFolder = `/punkga-launchpad-${launchpadId}/images`
      const { cid, filenames } = await this.ipfsService.uploadLocalFolderToIpfs(folderPath, ipfsImageFolder);

      //   - make & upload nft metadata
      const ipfsMetadataFolder = `/punkga-launchpad-${launchpadId}/metadata`
      const metadataObjects: IMetadata[] = filenames.map((filename, index: number) => ({
        token_id: index,
        name: index.toString(),
        description: 'punkga nft',
        attributes: [],
        image: `https://ipfs-gw.dev.aura.network/ipfs/${cid}/${index}`
      }))
      const medatadaFolderCid = await this.ipfsService.uploadMetadataObjectsToIpfs(metadataObjects, ipfsMetadataFolder)
      const metadataIpfsLink = `https://ipfs-gw.dev.aura.network/ipfs/${medatadaFolderCid}`;
      console.log(
        `\n\nUploaded metadata. Link: ${metadataIpfsLink}`
      );

      //   - upload metadata contract uri
      const metadataContract = {
        "name": launchpad.name,
        "image_url": launchpad.thumbnail_url,
        "banner_image_url": launchpad.thumbnail_url,
        "description": launchpad.description,
        "website": "https://punkga.me"
      }
      const metadataContractFolderPath = `/punkga-launchpad-${launchpadId}`;
      const metadataContractCid = await this.ipfsService.uploadMetadataContractToIpfs(metadataContract, metadataContractFolderPath)
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
          status: LaunchpadStatus.ReadyToMint
        }
      })
      if (updateResult.errors) return updateResult;
    }

    // query creator address
    const queryUserResult = await this.launchpadGraphql.queryCreatorAddress({
      id: userId
    });
    if (queryUserResult.errors) return queryUserResult;
    const creatorAddress = queryUserResult.data.authorizer_users_by_pk.wallet_address;

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
          maxSalePurchasePerAddress: launchpad.max_mint_per_address
        }
      },
      metadataURIBase: launchpad.metadata_uri_base,
      metadataContractURI: launchpad.metadata_contract_uri
    }
  }

  async publish(launchpadId: number) {
    // Update offchain launchpad data
  }

  async edit(launchpadId: number) {
    // Update offchain launchpad data
  }
}
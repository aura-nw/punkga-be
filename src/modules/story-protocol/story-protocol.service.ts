import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import { FilesService } from '../files/files.service';
import { StoryProtocolGraphql } from './story-protocol.graphql';
import {
  AddressZero,
  iliad,
  PIL_TYPE,
  RegisterIpAndAttachPilTermsResponse,
  RegisterIpAndMakeDerivativeResponse,
  RegisterIpResponse,
  StoryClient,
  StoryConfig,
} from '@story-protocol/core-sdk';
import {
  Address,
  createPublicClient,
  createWalletClient,
  http,
  toHex,
} from 'viem';
import { GetStoryArtworkQueryDto } from './dto/get-story-artwork-request.dto';
import { MasterWalletService } from '../../modules/user-wallet/master-wallet.service';
import { abi as nftContractAbi } from '../../abi/nftContractAbi.json';
import { NonCommercialSocialRemixingTermsId } from './utils';
import { CreateCollection } from './dto/create-collection-request.dto';
import { STORY_IP_STATUS } from '../../common/constant';

@Injectable()
export class StoryProtocolService {
  private logger = new Logger(StoryProtocolService.name);
  storyChain: any;
  private publicClient;
  private account: any;
  private storyClient: StoryClient;
  private walletClient;
  constructor(
    private storyProtocolGraphql: StoryProtocolGraphql,
    private configService: ConfigService,
    private filesService: FilesService,
    private masterWalletSerivce: MasterWalletService,
    @InjectQueue('story-protocol') private storyProtocolQueue: Queue
  ) {}

  async onModuleInit() {
    await this.buildStoryClient();
  }

  async createNewCollection(
    data: CreateCollection,
    files: Array<Express.Multer.File>
  ) {
    try {
      const { name, description } = data;
      const newCollection =
        await this.storyClient.nftClient.createNFTCollection({
          name,
          symbol: 'SCL',
          txOptions: { waitForTransaction: true },
        });
      var timestamp = Date.now() / 1000;
      let logoUrl = '';
      const logoFile = files.filter((f) => f.fieldname === 'logo')[0];
      if (logoFile)
        logoUrl = await this.filesService.uploadImageToS3(
          `story-collection-${name}-${timestamp}`,
          logoFile
        );
      const variables = {
        objects: [
          {
            name,
            symbol: 'SCL',
            description,
            contract_address: newCollection.nftContract,
            avatar: logoUrl,
          },
        ],
      };
      return this.storyProtocolGraphql.insertStoryCollection(variables);
      // return newCollection;
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async artworkMintNFTAndRegisterDerivativeNonCommercialTask(
    storyArtworkIPIds: number[],
    storyCollectionId: number
  ): Promise<any> {
    this.addJob({ storyArtworkIPIds, storyCollectionId });
    return true;
  }
  async artworkMintNFTAndRegisterDerivativeNonCommercial(
    storyArtworkIPIds: number[],
    storyCollectionId: number
  ): Promise<any> {
    try {
      const collectionInfo =
        await this.storyProtocolGraphql.queryStoryCollectionByPK({
          id: storyCollectionId,
        });
      const artworkList = (
        await this.storyProtocolGraphql.queryStoryArtworkByIds({
          id: storyArtworkIPIds,
        })
      ).data.story_artwork;
      const ipList = [];
      for await (const artwork of artworkList) {
        const response = await this.mintNFTAndRegisterDerivativeNonCommercial(
          //getfrom DB
          collectionInfo.data.story_collection_for_access_protocol_by_pk
            .contract_address as Address,
          this.account.address,
          artwork.story_artwork_story_ip_asset.ip_asset_id,
          '',
          '',
          '',
          artwork.ipfs_url
        );
        const ip = {
          collection_id: storyCollectionId,
          status: STORY_IP_STATUS.MINTED,
          contract_address:
            collectionInfo.data.story_collection_for_access_protocol_by_pk
              .contract_address,
          nft_id: response.nftId.toString(),
          parent_ipid: artwork.story_artwork_story_ip_asset.ip_asset_id,
          ip_metadata_uri: '',
          ip_meatadata_hash: '',
          nft_metadata_uri: artwork.ipfs_url,
          nft_metadata_hash: '',
          ipid: response.ipId,
          txhash: response.hash,
          owner: this.account.address,
        };
        ipList.push(ip);
        this.logger.debug('response.ipId', response.ipId);
      }
      this.logger.debug(
        'artworkMintNFTAndRegisterDerivativeNonCommercial ipIDList',
        ipList
      );

      return this.storyProtocolGraphql.insertStoryIP({ objects: ipList });
    } catch (error) {
      this.logger.error(
        'artworkMintNFTAndRegisterDerivativeNonCommercial error',
        error
      );

      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async mintNFTAndRegisterDerivativeNonCommercial(
    derivativeContractAddess: Address,
    to: Address,
    parentIpIds: Address,
    ipMetadataURI: string,
    ipMetadataHash: string,
    nftMetadataHash: string,
    nftMetadataURI: string
  ): Promise<any> {
    //mint NFT
    const nftID = await this.mintNFT(
      derivativeContractAddess,
      to,
      nftMetadataURI
    );
    //register Derivative
    const response = await this.registerIpAndMakeDerivative(
      parentIpIds,
      nftID.nftId,
      derivativeContractAddess,
      ipMetadataURI,
      ipMetadataHash,
      nftMetadataHash,
      nftMetadataURI
    );
    return {
      nftId: nftID.nftId,
      hash: response.hash,
      ipId: response.ipId,
    };
  }

  async mintNFT(
    contractAddess: Address,
    to: Address,
    nftMetadataURI: string
  ): Promise<any> {
    const { request } = await this.publicClient.simulateContract({
      address: contractAddess,
      functionName: 'mint',
      args: [to, nftMetadataURI],
      abi: nftContractAbi,
    });
    const hash = await this.walletClient.writeContract(request);
    const { logs } = (await this.publicClient.waitForTransactionReceipt({
      hash,
    })) as any;
    if (logs[0].topics[3]) {
      return { nftId: parseInt(logs[0].topics[3], 16) };
    }
  }

  async registerIpAndMakeDerivative(
    parentIpIds: Address,
    derivativeTokenId: number,
    nftContractAddress: Address,
    ipMetadataURI: string,
    ipMetadataHash: string,
    nftMetadataHash: string,
    nftMetadataURI: string
  ): Promise<any> {
    const registeredIpDerivativeResponse: RegisterIpAndMakeDerivativeResponse =
      await this.storyClient.ipAsset.registerDerivativeIp({
        nftContract: nftContractAddress,
        tokenId: derivativeTokenId!,
        derivData: {
          parentIpIds: [parentIpIds as Address],
          licenseTermsIds: [NonCommercialSocialRemixingTermsId],
        },
        ipMetadata: {
          ipMetadataURI,
          ipMetadataHash: toHex(ipMetadataHash, { size: 32 }),
          nftMetadataHash: toHex(nftMetadataHash, { size: 32 }),
          nftMetadataURI,
        },
        txOptions: { waitForTransaction: true },
      });
    console.log(
      `Derivative IPA created at transaction hash ${registeredIpDerivativeResponse.txHash}, IPA ID: ${registeredIpDerivativeResponse.ipId}`
    );
    return {
      hash: registeredIpDerivativeResponse.txHash,
      ipId: registeredIpDerivativeResponse.ipId,
    };
  }

  async getStoryArtwork(params: GetStoryArtworkQueryDto) {
    try {
      const { limit, offset } = params;
      const result = await this.storyProtocolGraphql.queryStoryArtwork({
        limit,
        offset,
      });

      return result;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async buildStoryClient() {
    if (!this.storyChain)
      this.storyChain = await this.storyProtocolGraphql.getStoryChain();

    if (!this.account) this.account = this.masterWalletSerivce.getAccount();
    if (!this.publicClient)
      this.publicClient = createPublicClient({
        chain: iliad,
        transport: http(this.storyChain.rpc),
        account: this.account,
      } as any);

    const config: StoryConfig = {
      account: this.account,
      transport: http(this.storyChain.rpc),
      chainId: 'iliad',
    };
    this.storyClient = StoryClient.newClient(config);

    if (!this.walletClient)
      this.walletClient = createWalletClient({
        chain: iliad,
        transport: http(this.storyChain.rpc),
        account: this.account,
      });
  }

  addJob(jobData: any) {
    return this.storyProtocolQueue.add(
      'access-protocol',
      {
        data: jobData,
      },
      {
        removeOnComplete: true,
        removeOnFail: 10,
        attempts: 5,
        backoff: 5000,
      }
    );
  }
}

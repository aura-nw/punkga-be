import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
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
import { mintNFTUtils } from './utils/mintNFT';
import {
  // NFTContractAddress,
  NonCommercialSocialRemixingTermsId,
  RPCProviderUrl,
  // account,
} from './utils/utils';
import { GetStoryArtworkQueryDto } from './dto/get-story-artwork-request.dto';
import { MasterWalletService } from '../../modules/user-wallet/master-wallet.service';
import { abi as storyEventAbi } from './../../abi/StoryEvent.json';
import { abi as defaultNftContractAbi } from './utils/defaultNftContractAbi.json';
import { UseAccountStoryConfig } from '@story-protocol/core-sdk/dist/declarations/src/types/config';

@Injectable()
export class StoryProtocolService {
  // private client: StoryClient;
  storyChain: any;
  // storyEventGraphql: any;
  private publicClient;
  private account: any;
  private storyClient: StoryClient;
  private walletClient;
  constructor(
    private storyProtocolGraphql: StoryProtocolGraphql,
    private configService: ConfigService,
    private masterWalletSerivce: MasterWalletService // @InjectQueue('story-Protocol') private storyProtocolQueue: Queue
  ) {}

  async onModuleInit() {
    await this.buildStoryClient();
  }

  async registerDerivativeIp(
    contractAddress: Address,
    uri: string,
    parentIpIds: string
  ) {
    try {
      // if (!this.client) {
      //   this.getStoryClient();
      // }
      // const contractAddress = '0x....';
      const derivativeTokenId = await mintNFTUtils(
        contractAddress,
        this.account.address,
        uri
      );
      const registeredIpDerivativeResponse: RegisterIpAndMakeDerivativeResponse =
        await this.storyClient.ipAsset.registerDerivativeIp({
          nftContract: contractAddress,
          tokenId: derivativeTokenId!,
          derivData: {
            parentIpIds: [parentIpIds as Address],
            licenseTermsIds: [NonCommercialSocialRemixingTermsId],
          },
          ipMetadata: {
            // ipMetadataURI: 'test-uri',
            // ipMetadataHash: toHex('test-metadata-hash', { size: 32 }),
            nftMetadataHash: toHex('test-nft-metadata-hash', { size: 32 }),
            nftMetadataURI: uri,
          },
          txOptions: { waitForTransaction: true },
        });
      return registeredIpDerivativeResponse;
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async createNewCollection(name: string, symbol: string) {
    try {
      // if (!this.client) {
      //   this.getStoryClient();
      // }
      const newCollection =
        await this.storyClient.nftClient.createNFTCollection({
          name,
          symbol,
          txOptions: { waitForTransaction: true },
        });
      return newCollection;
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async artworkMintNFTAndRegisterDerivativeNonCommercial(
    id: number[]
  ): Promise<any> {
    try {
      const artworkList =
        (await this.storyProtocolGraphql.queryStoryArtworkByIds({
          id,
        })).data.story_artwork;
      const ipIDList = [];
      for await (const artwork of artworkList) {
        const response = await this.mintNFTAndRegisterDerivativeNonCommercial(
          //getfrom DB
          '0x7841Ae6Bd690144149f0783eCE34e5F3A39CF24c' as Address,
          this.account.address,
          artwork.story_artwork_story_ip_asset.ip_asset_id,
          '',
          '',
          '',
          artwork.ipfs_url
        );
        ipIDList.push(response.ipId);
      }
      return { ipIDList };
    } catch (error) {
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
    return this.registerIpAndMakeDerivative(
      parentIpIds,
      nftID.nftId,
      derivativeContractAddess,
      ipMetadataURI,
      ipMetadataHash,
      nftMetadataHash,
      nftMetadataURI
    );
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
      abi: defaultNftContractAbi,
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
}

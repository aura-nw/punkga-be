import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import { FilesService } from '../files/files.service';
import { StoryProtocolGraphql } from './story-protocol.graphql';
import {
  RegisterIpAndMakeDerivativeResponse,
  RegisterIpResponse,
  StoryClient,
  StoryConfig,
} from '@story-protocol/core-sdk';
import { Address, http, toHex } from 'viem';
import { mintNFT } from './utils/mintNFT';
import {
  // NFTContractAddress,
  NonCommercialSocialRemixingTermsId,
  RPCProviderUrl,
  account,
} from './utils/utils';
import { GetStoryArtworkQueryDto } from './dto/get-story-artwork-request.dto';
@Injectable()
export class StoryProtocolService {
  private client: StoryClient;
  constructor(
    private storyProtocolGraphql: StoryProtocolGraphql,
    private configService: ConfigService,
    // @InjectQueue('story-Protocol') private storyProtocolQueue: Queue
  ) {}

  async registerDerivativeIp(
    contractAddress: Address,
    uri: string,
    parentIpIds: string
  ) {
    try {
      if (!this.client) {
        this.getStoryClient();
      }
      // const contractAddress = '0x....';
      const derivativeTokenId = await mintNFT(
        contractAddress,
        account.address,
        uri
      );
      const registeredIpDerivativeResponse: RegisterIpAndMakeDerivativeResponse =
        await this.client.ipAsset.registerDerivativeIp({
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
      if (!this.client) {
        this.getStoryClient();
      }
      const newCollection = await this.client.nftClient.createNFTCollection({
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

  async getStoryClient() {
    const config: StoryConfig = {
      account: account,
      transport: http(RPCProviderUrl),
      chainId: 'iliad',
    };
    const client = StoryClient.newClient(config);

    // insert db
    return client;
  }

  async getStoryArtwork(params: GetStoryArtworkQueryDto) {
    try {
      const {  limit, offset } = params;
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
}

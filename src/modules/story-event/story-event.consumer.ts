import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bullmq';

import {
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { createPublicClient, createWalletClient, http } from 'viem';
import { MasterWalletService } from '../user-wallet/master-wallet.service';
import { abi as storyEventAbi } from './../../abi/StoryEvent.json';
import { abi as storyEventDerivativeAbi } from './../../abi/StoryEventDerivative.json';
import { IJob } from './interfaces/job.interface';
import { SubmissionStatus, SubmissionType } from './story-event.enum';
import { StoryEventGraphql } from './story-event.graphql';
import {
  defaultPILTerms,
  iliad,
  parseTxIpRegisteredEvent,
  sleep,
} from './utils';

@Processor('story-event')
export class StoryEventConsumer implements OnModuleInit {
  private logger = new Logger(StoryEventConsumer.name);
  private storyChain: any;
  private publicClient;
  private account;
  private walletClient;

  constructor(
    private storyEventGraphql: StoryEventGraphql,
    private masterWalletSerivce: MasterWalletService
  ) {}

  async onModuleInit() {
    this.storyChain = await this.storyEventGraphql.getStoryChain();
  }

  @Process({ name: 'event', concurrency: 1 })
  async process(job: Job<IJob>) {
    const { type, data } = job.data;

    await this.buildStoryClient();

    switch (type) {
      case SubmissionType.Character:
        await this.createStoryCharacterIpAsset(data);
        break;
      case SubmissionType.Manga:
        await this.createStoryMangaIpAsset(data);
        break;
      case SubmissionType.Artwork:
        await this.createStoryArtworkIpAsset(data);
        break;
      default:
        this.logger.error(
          `invalid type of event job ${JSON.stringify(job.data)}`
        );
        break;
    }

    await sleep(1000);
    return {};
  }

  async buildStoryClient() {
    if (!this.storyChain)
      this.storyChain = await this.storyEventGraphql.getStoryChain();

    if (!this.publicClient)
      this.publicClient = createPublicClient({
        chain: iliad,
        transport: http(this.storyChain.rpc),
      });
    if (!this.account) this.account = this.masterWalletSerivce.getAccount();

    if (!this.walletClient)
      this.walletClient = createWalletClient({
        chain: iliad,
        transport: http(this.storyChain.rpc),
        account: this.account,
      });
  }

  async createStoryCharacterIpAsset(data: any) {
    try {
      // mint nft & create ipa
      const args = [
        data.user_wallet_address,
        [
          '',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          data.metadata_ipfs,
          data.nft_metadata_hash,
        ],
        [
          defaultPILTerms.transferable,
          defaultPILTerms.royaltyPolicy,
          defaultPILTerms.mintingFee,
          defaultPILTerms.expiration,
          defaultPILTerms.commercialUse,
          defaultPILTerms.commercialAttribution,
          defaultPILTerms.commercializerChecker,
          defaultPILTerms.commercializerCheckerData,
          defaultPILTerms.commercialRevShare,
          defaultPILTerms.commercialRevCelling,
          defaultPILTerms.derivativesAllowed,
          defaultPILTerms.derivativesAttribution,
          defaultPILTerms.derivativesApproval,
          defaultPILTerms.derivativesReciprocal,
          defaultPILTerms.derivativeRevCelling,
          defaultPILTerms.currency,
          defaultPILTerms.uri,
        ],
      ];

      const address =
        `${this.storyChain.contracts.story_event_contract}` as any;

      const hash = await this.walletClient.writeContract({
        abi: storyEventAbi,
        address,
        functionName: 'mintAndRegisterIpAndAttach',
        args,
        chain: iliad,
        account: this.account,
      });
      const txReceipt = (await this.publicClient.waitForTransactionReceipt({
        hash,
      })) as any;

      const targetLogs = parseTxIpRegisteredEvent(txReceipt);

      let nftId = 0;
      let ipAssetId = targetLogs[0].ipId;

      if (txReceipt.logs[0].topics[3]) {
        nftId = parseInt(txReceipt.logs[0].topics[3], 16);
      }

      // update offchain data
      // --- insert story ip asset
      const insertStoryIPAResult = await this.storyEventGraphql.insertStoryIPA({
        object: {
          ip_asset_id: ipAssetId,
          nft_contract_address: this.storyChain.contracts.story_event_contract,
          nft_token_id: nftId.toString(),
          tx_hash: hash,
          user_id: data.user_id,
        },
      });
      if (insertStoryIPAResult.errors) {
        this.logger.error(
          `Insert story IP Asset error: ${JSON.stringify(insertStoryIPAResult)}`
        );
        throw new InternalServerErrorException('Insert story IP Asset failed ');
      }

      // --- update character set story_ip_id
      const updateCharacterResult =
        await this.storyEventGraphql.updateCharacter({
          id: data.charater_id,
          story_ip_asset_id:
            insertStoryIPAResult.data.insert_story_ip_asset_one.id,
        });
      if (updateCharacterResult.errors) {
        this.logger.error(
          `Update story character error: ${JSON.stringify(
            updateCharacterResult
          )}`
        );
        throw new InternalServerErrorException(
          'Update story character failed '
        );
      }
      // --- update submission set status = done
      const updateSubmissionResult =
        await this.storyEventGraphql.updateSubmission({
          id: data.submission_id,
          status: SubmissionStatus.Approved,
        });
      if (updateSubmissionResult.errors) {
        this.logger.error(
          `Update submission error: ${JSON.stringify(updateSubmissionResult)}`
        );
        throw new InternalServerErrorException('Update submission failed ');
      }

      this.logger.log(
        `Create Character IP Asset Done: ipid ${ipAssetId} hash ${hash}`
      );
    } catch (error) {
      this.logger.error(error.message);
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async createStoryMangaIpAsset(data: any) {
    try {
      // mint nft & create ipa
      const { ipAssetId, nftId, hash, storyIPAId } =
        await this.mintAndRegisterIpAndMakeDerivative(data);

      // --- update story artwork set story_ip_id
      const updateStoryMangaResult =
        await this.storyEventGraphql.updateStoryManga({
          id: data.story_manga_id,
          story_ip_asset_id: storyIPAId,
        });
      if (updateStoryMangaResult.errors) {
        this.logger.error(
          `Update story artwork error: ${JSON.stringify(
            updateStoryMangaResult
          )}`
        );
        throw new InternalServerErrorException('Update story manga failed ');
      }

      this.logger.log(
        `Create Manga IP Asset Done: ipid ${ipAssetId} hash ${hash}`
      );
    } catch (error) {
      this.logger.error(error.message);
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async createStoryArtworkIpAsset(data: any) {
    try {
      // mint nft & create ipa
      const { ipAssetId, nftId, hash } =
        await this.mintAndRegisterIpAndMakeDerivative(data);

      // update offchain data
      // --- insert story ip asset
      const insertStoryIPAResult = await this.storyEventGraphql.insertStoryIPA({
        object: {
          ip_asset_id: ipAssetId,
          nft_contract_address: this.storyChain.contracts.story_event_contract,
          nft_token_id: nftId.toString(),
          tx_hash: hash,
          user_id: data.user_id,
        },
      });
      if (insertStoryIPAResult.errors) {
        this.logger.error(
          `Insert story IP Asset error: ${JSON.stringify(insertStoryIPAResult)}`
        );
        throw new InternalServerErrorException('Insert story IP Asset failed ');
      }

      // // --- update story artwork set story_ip_id
      // const updateStoryArtworkResult =
      //   await this.storyEventGraphql.updateStoryArtwork({
      //     id: data.story_artwork_id,
      //     story_ip_asset_id:
      //       insertStoryIPAResult.data.insert_story_ip_asset_one.id,
      //   });
      // if (updateStoryArtworkResult.errors) {
      //   this.logger.error(
      //     `Update story artwork error: ${JSON.stringify(
      //       updateStoryArtworkResult
      //     )}`
      //   );
      //   throw new InternalServerErrorException('Update story artwork failed ');
      // }
      // --- update submission set status = done
      const updateSubmissionResult =
        await this.storyEventGraphql.updateSubmission({
          id: data.submission_id,
          status: SubmissionStatus.Approved,
        });
      if (updateSubmissionResult.errors) {
        this.logger.error(
          `Update submission error: ${JSON.stringify(updateSubmissionResult)}`
        );
        throw new InternalServerErrorException('Update submission failed ');
      }

      this.logger.log(
        `Create Artwork IP Asset Done: ipid ${ipAssetId} hash ${hash}`
      );
    } catch (error) {
      this.logger.error(error.message);
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async mintAndRegisterIpAndMakeDerivative(data: any) {
    const args = [
      [
        data.ip_asset_ids,
        '0x8bb1ade72e21090fc891e1d4b88ac5e57b27cb31',
        data.ip_asset_ids.map(() => defaultPILTerms.licenseTermsIds),
        defaultPILTerms.royaltyContext,
      ],
      [
        data.metadata_ipfs,
        data.metadata_hash,
        data.metadata_ipfs,
        data.metadata_hash,
      ],
      data.user_wallet_address,
    ];

    const address =
      `${this.storyChain.contracts.story_event_derivative_contract}` as any;

    const hash = await this.walletClient.writeContract({
      abi: storyEventDerivativeAbi,
      address,
      functionName: 'mintAndRegisterIpAndMakeDerivative',
      args,
      chain: iliad,
      account: this.account,
    });
    const txReceipt = (await this.publicClient.waitForTransactionReceipt({
      hash,
    })) as any;

    const targetLogs = parseTxIpRegisteredEvent(txReceipt);

    let nftId = 0;
    let ipAssetId = targetLogs[0].ipId;

    if (txReceipt.logs[0].topics[3]) {
      nftId = parseInt(txReceipt.logs[0].topics[3], 16);
    }

    // update offchain data
    // --- insert story ip asset
    const insertStoryIPAResult = await this.storyEventGraphql.insertStoryIPA({
      object: {
        ip_asset_id: ipAssetId,
        nft_contract_address: this.storyChain.contracts.story_event_contract,
        nft_token_id: nftId.toString(),
        tx_hash: hash,
        user_id: data.user_id,
      },
    });
    if (insertStoryIPAResult.errors) {
      this.logger.error(
        `Insert story IP Asset error: ${JSON.stringify(insertStoryIPAResult)}`
      );
      throw new InternalServerErrorException('Insert story IP Asset failed ');
    }

    // --- update submission set status = done
    const updateSubmissionResult =
      await this.storyEventGraphql.updateSubmission({
        id: data.submission_id,
        status: SubmissionStatus.Approved,
      });
    if (updateSubmissionResult.errors) {
      this.logger.error(
        `Update submission error: ${JSON.stringify(updateSubmissionResult)}`
      );
      throw new InternalServerErrorException('Update submission failed ');
    }

    return {
      ipAssetId,
      nftId,
      hash,
      storyIPAId: insertStoryIPAResult.data.insert_story_ip_asset_one.id,
    };
  }
}

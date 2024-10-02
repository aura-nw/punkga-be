import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bullmq';
import { IJob } from './interfaces/job.interface';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { StoryEventGraphql } from './story-event.graphql';
import { JsonRpcProvider } from 'ethers';
import { MasterWalletService } from '../user-wallet/master-wallet.service';
import { SubmissionStatus } from './story-event.enum';
import { createPublicClient, createWalletClient, http } from 'viem';
import { iliad } from './utils';
import { abi as storyEventAbi } from './../../abi/StoryEvent.json';

@Processor('storyEvent')
export class StoryEventConsumer {
  private logger = new Logger(StoryEventConsumer.name);
  constructor(
    private storyEventGraphql: StoryEventGraphql,
    private masterWalletSerivce: MasterWalletService
  ) {}

  @Process({ name: 'event', concurrency: 1 })
  async process(job: Job<IJob>) {
    const { type, data } = job.data;

    switch (type) {
      case 'character':
        return this.createStoryCharacterIpAsset(data);
      case 'manga':
        return this.createStoryMangaIpAsset(data);
      case 'artwork':
        return this.createStoryArtworkIpAsset(data);
      default:
        this.logger.error(
          `invalid type of event job ${JSON.stringify(job.data)}`
        );
        break;
    }
    return {};
  }

  async createStoryCharacterIpAsset(data: any) {
    try {
      // mint nft & create ipa
      const storyChain = await this.storyEventGraphql.getStoryChain();

      const provider = new JsonRpcProvider(storyChain.rpc);
      const contractWithMasterWallet =
        this.masterWalletSerivce.getStoryEventContract(
          storyChain.contracts.story_event_contract,
          provider
        );

      const publicClient = createPublicClient({
        chain: iliad,
        transport: http(storyChain.rpc),
      });

      const args = [
        '0x1c615a47F1091517c712304D874C031A97fc9333',
        data.metadata_ipfs,
        [
          true,
          '0x7f6a8f43ec6059ec80c172441cee3423988a0be9',
          100,
          0,
          true,
          true,
          '0x0000000000000000000000000000000000000000',
          '0x',
          50,
          1,
          true,
          false,
          false,
          true,
          1,
          '0x91f6f05b08c16769d3c85867548615d270c42fc7',
          '',
        ],
      ];

      const account = this.masterWalletSerivce.getAccount();

      const walletClient = createWalletClient({
        chain: iliad,
        transport: http(storyChain.rpc),
        account,
      });

      const address = `${storyChain.contracts.story_event_contract}`;

      const hash = await walletClient.writeContract({
        abi: storyEventAbi,
        address: '0x3c8B2E46c2bb3b94e619c7867f2D685C3caA9909',
        functionName: 'mintAndRegisterIpAndAttach',
        args,
        chain: iliad,
        account,
      });
      const { logs } = await publicClient.waitForTransactionReceipt({
        hash,
      });
      // if (logs[0].topics[3]) {
      //   return parseInt(logs[0].topics[3], 16);
      // }

      // const { request } = await publicClient.simulateContract({
      //   abi: storyEventAbi,
      //   address: storyChain.contracts.story_event_contract,
      //   functionName: 'mintAndRegisterIpAndAttach',
      //   args,
      // });

      // console.log(request);

      // const mintNftTx =
      //   await contractWithMasterWallet.mintAndRegisterIpAndAttach(
      //     '0x7c756cba10ff2c65016494e8ba37c12a108572b5',
      //     data.metadata_ipfs,
      //     [
      //       'true',
      //       '0x7f6a8f43ec6059ec80c172441cee3423988a0be9',
      //       '100',
      //       '0',
      //       'true',
      //       'true',
      //       '0x0000000000000000000000000000000000000000',
      //       '0x',
      //       '50',
      //       '1',
      //       'true',
      //       'false',
      //       'false',
      //       'true',
      //       '1',
      //       '0x91f6f05b08c16769d3c85867548615d270c42fc7',
      //       "''",
      //     ]
      //   );

      // const updateXpTxResult = await mintNftTx.wait();

      // update offchain data
      // --- insert story ip asset
      const insertStoryIPAResult = await this.storyEventGraphql.insertStoryIPA({
        object: {
          ip_asset_id: '1',
          nft_contract_address: storyChain.contracts.story_event_contract,
          nft_token_id: '1',
          tx_hash: '',
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
          status: SubmissionStatus.Done,
        });
      if (updateSubmissionResult.errors) {
        this.logger.error(
          `Update submission error: ${JSON.stringify(updateSubmissionResult)}`
        );
        throw new InternalServerErrorException('Update submission failed ');
      }
    } catch (error) {
      this.logger.error(error.message);
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async createStoryMangaIpAsset(data: any) {}

  async createStoryArtworkIpAsset(data: any) {}
}

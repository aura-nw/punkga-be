import { Queue } from 'bull';

import { InjectQueue } from '@nestjs/bull';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { RewardStatus } from '../../common/enum';
import { ContextProvider } from '../../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { errorOrEmpty } from '../graphql/utils';
import { RedisService } from '../redis/redis.service';
import { CheckRewardService } from './check-reward.service';
import { IRewardInfo } from './interface/ireward-info';
import { QuestGraphql } from './quest.graphql';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    private configService: ConfigService,
    private filesService: FilesService,
    private questGraphql: QuestGraphql,
    private checkRewardService: CheckRewardService,
    private redisClientService: RedisService,
    @InjectQueue('quest')
    private readonly questQueue: Queue
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async triggerClaimReward() {
    // const activeJobCount = await this.questQueue.getActiveCount();
    // if (activeJobCount > 0) {
    //   this.logger.debug(`Busy Queue Execute Onchain`);
    //   return true;
    // }

    const data = {
      redisKey: 'punkga:job:claim-reward',
      time: new Date().toUTCString(),
    };

    // this.logger.debug(`create job to claim reward`);
    // create job to claim reward
    await this.questQueue.add('claim-reward', data, {
      removeOnComplete: true,
      removeOnFail: 10,
      attempts: 5,
      backoff: 5000,
    });
  }

  async answerQuest(questId: number, answer: string) {
    try {
      const { userId, token } = ContextProvider.getAuthUser();

      const quest = await this.questGraphql.getQuestDetail({
        id: questId,
      });

      if (!quest) throw new NotFoundException('quest not found');

      const activity = {
        user_id: userId,
        quest_id: questId,
        activity: {
          answer,
        },
      };

      if (quest.repeat === 'Daily' && quest.repeat_quests?.length > 0) {
        activity['repeat_quest_id'] = quest.repeat_quests[0].id;
      }

      const result = await this.questGraphql.answerQuest(
        {
          quest_activities: [activity],
        },
        token
      );

      return result;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async upload(name: string, file: Express.Multer.File) {
    try {
      const url = await this.filesService.uploadImageToS3(`nft`, file);

      const { cid, originalname } = await this.filesService.uploadImageToIpfs(
        file
      );

      const ipfsDisplayUrl =
        this.configService.get<string>('network.ipfsQuery');

      const image = `${ipfsDisplayUrl}/${cid}/${originalname}`;

      // upload metadata to ipfs
      const metadata = {
        name,
        description: `Punkga Reward - ${name}`,
        attributes: [],
        image,
      };
      const { cid: metadataCID } = await this.filesService.uploadMetadataToIpfs(
        metadata,
        `/metadata-${new Date().getTime()}`
      );

      this.logger.debug(`uploading nft image ${file.originalname} success`);
      return {
        url,
        ipfs: `${ipfsDisplayUrl}/${metadataCID}`,
      };
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async get(questId: number, userId?: string) {
    try {
      const quest = await this.questGraphql.getQuestDetail({
        id: questId,
      });

      if (!quest) throw new NotFoundException('quest not found');

      quest.reward_status = await this.checkRewardService.getClaimRewardStatus(
        quest,
        userId
      );

      return quest;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async claimReward(questId: number) {
    try {
      const { userId } = ContextProvider.getAuthUser();

      const quest = await this.questGraphql.getQuestDetailWithUserCampaign({
        id: questId,
        user_id: userId,
      });

      const userCampaignId = quest.quests_campaign.campaign_user[0].id;

      const rewardStatus = await this.checkRewardService.getClaimRewardStatus(
        quest,
        userId
      );
      if (rewardStatus !== RewardStatus.CanClaimReward)
        throw new ForbiddenException('reward status invalid');

      // add unique key to db (duplicate item protection)
      let uniqueKey = `q-${userId}-${questId}`;
      if (quest.repeat === 'Daily' && quest.repeat_quests?.length > 0)
        uniqueKey = `q-${userId}-${questId}-r${quest.repeat_quests[0].id}`;

      // insert new request
      const result = await this.questGraphql.insertRequestLog({
        data: {
          userId,
          questId,
        },
        unique_key: uniqueKey,
      });

      if (errorOrEmpty(result, 'insert_request_log_one')) return result;
      this.logger.debug(`insert request success ${JSON.stringify(result)}`);

      const requestId = result.data.insert_request_log_one.id;

      const rewardInfo: IRewardInfo = {
        requestId,
        userId,
        questId,
        userCampaignId,
        chainId: quest.quests_campaign.chain_id,
      };

      const env = this.configService.get<string>('app.env') || 'prod';
      this.redisClientService.client.rPush(
        `punkga-${env}:reward-users`,
        JSON.stringify(rewardInfo)
      );

      return {
        requestId,
      };
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async deleteQuest(questId: number) {
    try {
      const { token } = ContextProvider.getAuthUser();
      const refQuest = await this.questGraphql.getRefQuest(questId, token);

      if (refQuest && refQuest.length > 0) {
        return {
          success: false,
          ref_quest: refQuest,
        };
      }

      return this.questGraphql.deleteQuest(questId, token);
    } catch (errors) {
      return {
        errors,
      };
    }
  }
}

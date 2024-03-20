import { Queue } from 'bull';

import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { RewardStatus } from '../../common/enum';
import { ContextProvider } from '../../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { errorOrEmpty } from '../graphql/utils';
import { RedisService } from '../redis/redis.service';
import { CheckRewardService } from './check-reward.service';
import { IRewardInfo } from './interface/ireward-info';
import { QuestGraphql } from './quest.graphql';

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    private filesService: FilesService,
    private questGraphql: QuestGraphql,
    private checkRewardService: CheckRewardService,
    private redisClientService: RedisService,
    @InjectQueue('quest')
    private readonly questQueue: Queue
  ) { }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async triggerClaimReward() {
    const activeJobCount = await this.questQueue.getActiveCount();
    if (activeJobCount > 0) {
      this.logger.debug(`Busy Queue Execute Onchain`);
      return true;
    }

    const data = {
      redisKey: 'punkga:job:claim-reward',
      time: new Date().toUTCString(),
    };

    // create job to claim reward
    await this.questQueue.add('claim-reward', data, {
      removeOnComplete: true,
      removeOnFail: 10,
      attempts: 5,
      backoff: 5000
    });
  }

  async answerQuest(questId: number, answer: string) {
    try {
      const { userId, token } = ContextProvider.getAuthUser();

      const quest = await this.questGraphql.getQuestDetail({
        id: questId,
      });

      if (!quest) throw new NotFoundException();

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

  async upload(file: Express.Multer.File) {
    try {
      const url = await this.filesService.uploadImageToS3(`nft`, file);

      const ipfs = await this.filesService.uploadImageToIpfs(file);

      this.logger.debug(`uploading nft image ${file.originalname} success`);
      return {
        url,
        ipfs,
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

      if (!quest) throw new NotFoundException();

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
      const { userId, token } = ContextProvider.getAuthUser();

      const user = await this.questGraphql.queryPublicUserWalletData(
        {
          id: userId,
        },
      );
      if (!user.authorizer_users_user_wallet?.address) {
        throw new BadRequestException('User wallet address not found')
      }

      const quest = await this.questGraphql.getQuestDetailWithUserCampaign({
        id: questId,
        user_id: userId
      });

      const userCampaignId = quest.quests_campaign.campaign_user[0].id;

      const rewardStatus = await this.checkRewardService.getClaimRewardStatus(
        quest,
        userId
      );
      if (rewardStatus !== RewardStatus.CanClaimReward)
        throw new ForbiddenException();

      // add unique key to db (duplicate item protection)
      let uniqueKey = `q-${userId}-${questId}`
      if (quest.repeat === 'Daily' && quest.repeat_quests?.length > 0) uniqueKey = `q-${userId}-${questId}-${quest.repeat_quests[0].id}`

      // insert new request
      const result = await this.questGraphql.insertRequestLog({
        data: {
          userId,
          questId
        },
        unique_key: uniqueKey
      })

      if (errorOrEmpty(result, 'insert_request_log_one')) return result;
      this.logger.debug(`insert request success ${JSON.stringify(result)}`)

      const requestId = result.data.insert_request_log_one.id;

      const rewardInfo: IRewardInfo = {
        requestId,
        userId,
        questId,
        userCampaignId
      }

      this.redisClientService.client.rPush('punkga:reward-users', JSON.stringify(rewardInfo))

      return {
        requestId,
      }

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

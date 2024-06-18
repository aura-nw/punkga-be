import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ContextProvider } from '../../providers/contex.provider';
import { errorOrEmpty } from '../graphql/utils';
import { generateSlug } from '../manga/util';
import { CheckConditionService } from '../quest/check-condition.service';
import { CheckRewardService } from '../quest/check-reward.service';
import { UserGraphql } from '../user/user.graphql';
import { CampaignGraphql } from './campaign.graphql';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { QuestGraphql } from '../quest/quest.graphql';
import { IRewardInfo } from '../quest/interface/ireward-info';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private configService: ConfigService,
    private campaignGraphql: CampaignGraphql,
    private checkConditionService: CheckConditionService,
    private checkRewardService: CheckRewardService,
    private userGraphql: UserGraphql,
    private questGraphql: QuestGraphql,
    private redisClientService: RedisService
  ) {}

  async create(data: CreateCampaignDto) {
    const { token } = ContextProvider.getAuthUser();

    const slug = generateSlug(data.name);
    return this.campaignGraphql.createCampaign(
      slug,
      data.name,
      data.status,
      data.start_date,
      data.end_date,
      data.reward,
      data.description,
      token
    );
  }

  async getAll(userId: string) {
    return this.campaignGraphql.getAllPublishedCampaign(userId);
  }

  async getPublicCampaignDetail(slug: string) {
    return this.campaignGraphql.getCampaignPublicDetail(slug);
  }

  async getAuthorizedCampaignDetail(slug: string) {
    try {
      const { userId } = ContextProvider.getAuthUser();

      const publicCampaignDetail = await this.getPublicCampaignDetail(slug);
      const campaignId = publicCampaignDetail.data.campaign[0].id;

      // check enroll
      const userCampaign = await this.campaignGraphql.getUserCampaign(
        campaignId,
        userId
      );
      if (errorOrEmpty(userCampaign, 'user_campaign'))
        return publicCampaignDetail;

      // get auth-ed campaign info
      const result = await this.campaignGraphql.getCampaignAuthDetail(
        campaignId,
        userId
      );

      if (errorOrEmpty(result, 'campaign')) return result;
      const campaign = result.data.campaign[0];

      const user = await this.userGraphql.queryUserLevel({
        id: userId,
      });

      const checkConditionPromises = [];
      const checkRewardPromises = [];

      campaign.campaign_quests.forEach((quest) => {
        // check condition

        checkConditionPromises.push(
          this.checkConditionService.verify(quest.condition, user)
        );

        // check reward status
        checkRewardPromises.push(
          this.checkRewardService.getClaimRewardStatus(quest, userId)
        );
      });

      const checkConditionResult = await Promise.all(checkConditionPromises);
      checkConditionResult.forEach((result, index) => {
        campaign.campaign_quests[index].unlock = result;
      });

      const checkRequirementResult = await Promise.all(checkRewardPromises);
      checkRequirementResult.forEach((result, index) => {
        campaign.campaign_quests[index].reward_status = result;
      });

      result.data.campaign[0] = campaign;

      return result;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async enroll(campaignId: number) {
    try {
      const { userId, token } = ContextProvider.getAuthUser();

      const [campaign] = await this.campaignGraphql.getPublishedOngoingCampaign(
        campaignId
      );

      const result = await this.campaignGraphql.enrollCampaign(
        userId,
        campaign.id,
        token
      );

      return result;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async claimReward(campaignId: number) {
    try {
      const { userId, token } = ContextProvider.getAuthUser();

      const user = await this.questGraphql.queryPublicUserWalletData({
        id: userId,
      });
      if (!user.authorizer_users_user_wallet?.address) {
        throw new BadRequestException('User wallet address not found');
      }

      // check top 1 user of campaign
      const top1UserCampaign = await this.campaignGraphql.getTop1UserCampaign(
        campaignId,
        token
      );
      if (userId !== top1UserCampaign.user_id) throw new ForbiddenException();

      // check claim status
      if (top1UserCampaign.user_campaign_user_campaign_rewards.length > 0)
        throw new ForbiddenException();

      // add unique key to db (duplicate item protection)
      const uniqueKey = `c-${userId}-${campaignId}`;

      // insert new request
      const result = await this.questGraphql.insertRequestLog({
        data: {
          userId,
          campaignId,
        },
        unique_key: uniqueKey,
      });

      if (errorOrEmpty(result, 'insert_request_log_one')) return result;
      this.logger.debug(`insert request success ${JSON.stringify(result)}`);

      const requestId = result.data.insert_request_log_one.id;

      const rewardInfo: IRewardInfo = {
        requestId,
        userId,
        campaignId,
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

  async getUserRank(campaignId: number) {
    const { userId } = ContextProvider.getAuthUser();
    return this.campaignGraphql.getUserCampaignRank(campaignId, userId);
  }
}

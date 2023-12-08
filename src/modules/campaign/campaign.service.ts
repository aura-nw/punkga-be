import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { CampaignGraphql } from './campaign.graphql';
import { ContextProvider } from '../../providers/contex.provider';
import { errorOrEmpty } from '../graphql/utils';
import { CheckConditionService } from '../quest/check-condition.service';
import { UserGraphql } from '../user/user.graphql';
import { CheckRewardService } from '../quest/check-reward.service';
import { CampaignRewardService } from './reward.service';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private campaignGraphql: CampaignGraphql,
    private checkConditionService: CheckConditionService,
    private checkRewardService: CheckRewardService,
    private userGraphql: UserGraphql,
    private campaignRewardService: CampaignRewardService
  ) {}

  async getAll(userId: string) {
    return this.campaignGraphql.getAllPublishedCampaign(userId);
  }

  async getPublicCampaignDetail(id: number) {
    return this.campaignGraphql.getCampaignPublicDetail(id);
  }

  async getAuthorizedCampaignDetail(id: number) {
    const { userId } = ContextProvider.getAuthUser();

    // check enroll
    const userCampaign = await this.campaignGraphql.getUserCampaign(id, userId);
    if (errorOrEmpty(userCampaign, 'user_campaign'))
      return this.getPublicCampaignDetail(id);

    // get auth-ed campaign info
    const result = await this.campaignGraphql.getCampaignAuthDetail(id, userId);

    if (errorOrEmpty(result, 'campaign')) return result;
    const campaign = result.data.campaign[0];

    const user = await this.userGraphql.queryUserLevel({
      id: userId,
    });

    const promises = [];

    campaign.campaign_quests.forEach((quest, index) => {
      // check condition
      campaign.campaign_quests[index].unlock =
        this.checkConditionService.verify(quest.condition, user);

      // check reward status
      promises.push(
        this.checkRewardService.getClaimRewardStatus(quest, userId)
      );
    });

    const checkRequirementResult = await Promise.all(promises);
    checkRequirementResult.forEach((result, index) => {
      campaign.campaign_quests[index].reward_status = result;
    });

    result.data.campaign[0] = campaign;

    return result;
  }

  async enroll(campaignId: number) {
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
  }

  async claimReward(campaignId: number) {
    const { userId, token } = ContextProvider.getAuthUser();
    // check top 1 user of campaign
    const top1UserCampaign = await this.campaignGraphql.getTop1UserCampaign(
      campaignId,
      token
    );
    if (userId !== top1UserCampaign.user_id) throw new ForbiddenException();

    // check claim status
    if (top1UserCampaign.user_campaign_user_campaign_rewards.length > 0)
      throw new ForbiddenException();

    // reward
    if (top1UserCampaign.user_campaign_campaign.reward?.xp) {
      // return this.questRewardService.increaseUserXp(
      //   userId,
      //   quest,
      //   quest.reward?.xp,
      //   token
      // );
    }

    if (top1UserCampaign.user_campaign_campaign.reward?.nft) {
      // mint nft
      return this.campaignRewardService.mintNft(
        userId,
        top1UserCampaign,
        token
      );
    }
  }
}

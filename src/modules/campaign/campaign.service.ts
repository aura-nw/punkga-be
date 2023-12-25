import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { CampaignGraphql } from './campaign.graphql';
import { ContextProvider } from '../../providers/contex.provider';
import { errorOrEmpty } from '../graphql/utils';
import { CheckConditionService } from '../quest/check-condition.service';
import { UserGraphql } from '../user/user.graphql';
import { CheckRewardService } from '../quest/check-reward.service';
import { CampaignRewardService } from './reward.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { generateSlug } from '../manga/util';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private campaignGraphql: CampaignGraphql,
    private checkConditionService: CheckConditionService,
    private checkRewardService: CheckRewardService,
    private userGraphql: UserGraphql,
    private campaignRewardService: CampaignRewardService
  ) { }

  async create(data: CreateCampaignDto) {
    const { token } = ContextProvider.getAuthUser();

    const slug = generateSlug(data.name, new Date().valueOf());
    return this.campaignGraphql.createCampaign(
      slug,
      data.name,
      data.status,
      data.start_date,
      data.end_date,
      data.reward,
      data.description,
      token
    )
  }

  async getAll(userId: string) {
    return this.campaignGraphql.getAllPublishedCampaign(userId);
  }

  async getPublicCampaignDetail(slug: string) {
    return this.campaignGraphql.getCampaignPublicDetail(slug);
  }

  async getAuthorizedCampaignDetail(slug: string) {
    const { userId } = ContextProvider.getAuthUser();

    const publicCampaignDetail = await this.getPublicCampaignDetail(slug);
    const campaignId = publicCampaignDetail.data.campaign[0].id;

    // check enroll
    const userCampaign = await this.campaignGraphql.getUserCampaign(campaignId, userId);
    if (errorOrEmpty(userCampaign, 'user_campaign'))
      return publicCampaignDetail;

    // get auth-ed campaign info
    const result = await this.campaignGraphql.getCampaignAuthDetail(campaignId, userId);

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
    const promises = [];
    if (top1UserCampaign.user_campaign_campaign.reward?.xp) {
      promises.push(this.campaignRewardService.increaseUserXp(
        userId,
        top1UserCampaign,
        token
      ));
    }

    if (top1UserCampaign.user_campaign_campaign.reward?.nft) {
      // mint nft
      promises.push(this.campaignRewardService.mintNft(
        userId,
        top1UserCampaign,
        token
      ));
    }

    const result = await Promise.all(promises);
    return result;
  }
}

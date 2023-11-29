import { Injectable, Logger } from '@nestjs/common';
import { CampaignGraphql } from './campaign.graphql';
import { ContextProvider } from '../../providers/contex.provider';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(private campaignGraphql: CampaignGraphql) {}

  async getAll(userId: string) {
    return this.campaignGraphql.getAllPublishedCampaign(userId);
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
}

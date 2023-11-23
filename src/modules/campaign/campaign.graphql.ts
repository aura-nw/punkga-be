import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class CampaignGraphql {
  constructor(
    private configService: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async getPublishedOngoingCampaign(campaignId: number) {
    const result = await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `query get_published_ongoing_campaign($id: Int!) {
        campaign(where: {id: {_eq: $id}, status: {_eq: "Published"}, start_date: {_lte: "now()"}, end_date: {_gte: "now()"}}) {
          id
        }
      }
      `,
      'get_published_ongoing_campaign',
      {
        id: campaignId,
      }
    );
    if (this.graphqlSvc.errorOrEmpty(result, 'campaign')) {
      throw new ForbiddenException('campaign invalid');
    }

    return result.data.campaign;
  }

  async enrollCampaign(userId: string, campaignId: number, userToken: string) {
    const result = await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      userToken,
      `mutation enroll_campaign($user_id: bpchar!, $campaign_id: Int!) {
        insert_user_campaign(objects: {user_id: $user_id, total_reward_xp: 0, campaign_id: $campaign_id}) {
          affected_rows
        }
      }
      
      `,
      'enroll_campaign',
      {
        user_id: userId,
        campaign_id: campaignId,
      }
    );

    if (result.errors) throw new ForbiddenException(result.errors);
    return result;
  }
}

import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';
import { errorOrEmpty } from '../graphql/utils';

@Injectable()
export class CampaignGraphql {
  constructor(
    private configService: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async getUserCampaign(campaignId: number, userId: string) {
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `query user_campaign($campaign_id: Int!, $user_id: bpchar!) {
        user_campaign(where: {campaign_id: {_eq: $campaign_id}, user_id: {_eq: $user_id}}) {
          id
          user_id
          campaign_id
          created_at
        }
      }`,
      'user_campaign',
      {
        campaign_id: campaignId,
        user_id: userId,
      }
    );
  }

  async getCampaignPublicDetail(id: number) {
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `query campaign_detail($id: Int!) {
        campaign(where: {id: {_eq: $id}}) {
          id
          name
          start_date
          end_date
          description
          reward
          participants: campaign_user_aggregate {
            aggregate {
              count
            }
          }
        }
      }`,
      'campaign_detail',
      {
        id,
      }
    );
  }

  async getCampaignAuthDetail(id: number, userId: string) {
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `query campaign_detail($id: Int!, $user_id: bpchar!) {
        campaign(where: {id: {_eq: $id}}) {
          id
          name
          start_date
          end_date
          description
          reward
          participants: campaign_user_aggregate {
            aggregate {
              count
            }
          }
          campaign_quests {
            id
            name
            description
            condition
            requirement
            reward
            status
            type
            repeat
            quest_reward_claimed
            repeat_quests {
              id
              repeat_quest_reward_claimed
              repeat_quests_quest_activities(where: {user_id: {_eq: $user_id}}, limit: 1, order_by: {created_at: desc}) {
                id
                activity
                quest_id
                repeat_quest_id
                user_id
                created_at
              }
            }
            quests_quest_activities(where: {user_id: {_eq: $user_id}}, limit: 1, order_by: {created_at: desc}) {
              activity
              quest_id
              user_id
              created_at
            }
          }
        }
      }`,
      'campaign_detail',
      {
        id,
        user_id: userId,
      }
    );
  }

  async getAllPublishedCampaign(userId: string) {
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `query campaign($user_id: bpchar = "") {
        campaign(where: {status: {_eq: "Published"}}, order_by: {created_at: desc}) {
          id
          name
          description
          start_date
          end_date
          status
          reward
          campaign_user(where: {user_id: {_eq: $user_id}}) {
            id
            created_at
          }
        }
      }
      `,
      'campaign',
      {
        user_id: userId,
      }
    );
  }

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
    if (errorOrEmpty(result, 'campaign')) {
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

  async getTop1UserCampaign(
    campaignId: number,
    userToken: string
  ): Promise<any> {
    const result = await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      userToken,
      `query top_user_campaign($id: Int!) {
        user_campaign(where: {campaign_id: {_eq: $id}}, order_by: {total_reward_xp: desc_nulls_last, created_at: asc}, limit: 1) {
          id
          user_id
          campaign_id
          total_reward_xp
          user_campaign_rank
          campaign_id
          user_campaign_campaign {
            reward
          }
          user_campaign_user_campaign_rewards {
            tx_hash
            created_at
          }
        }
      }`,
      'top_user_campaign',
      {
        id: campaignId,
      }
    );

    if (errorOrEmpty(result, 'user_campaign'))
      throw new ForbiddenException(result.errors);

    return result.data.user_campaign[0];
  }

  async insertUserCampaignReward(
    campaignId: number,
    txHash: string,
    userCampaignId: number,
    userToken: string
  ) {
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      userToken,
      `mutation insert_user_campaign_reward($campaign_id: Int!, $tx_hash: String!, $user_campaign_id: Int!) {
        insert_user_campaign_reward(objects: {campaign_id: $campaign_id, tx_hash: $tx_hash, user_campaign_id: $user_campaign_id}) {
          affected_rows
        }
      }`,
      'insert_user_campaign_reward',
      {
        campaign_id: campaignId,
        tx_hash: txHash,
        user_campaign_id: userCampaignId,
      }
    );
  }
}
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';
import { errorOrEmpty } from '../graphql/utils';

@Injectable()
export class UserGraphql {
  private readonly logger = new Logger(UserGraphql.name);
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) { }

  async getChapterDetail(variables: any) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query chapters($id: Int!) {
        chapters(where: {id: {_eq: $id}}) {
          chapter_type
          manga_id
        }
      }`,
      'chapters',
      variables
    );

    if (errorOrEmpty(result, 'chapters')) throw new NotFoundException();

    return result.data.chapters[0];
  }

  async getAllPublishedQuest(userId: string) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query queryAvailableQuests($user_id: bpchar!, $now: timestamptz!) {
        user_campaign(where: {user_id: {_eq: $user_id}, user_campaign_campaign: {status: {_eq: "Published"}, start_date: {_lte: $now}, end_date: {_gte: $now}}}, order_by: {created_at: desc}) {
          user_campaign_campaign {
            start_date
            end_date
            campaign_quests(where: {status: {_eq: "Published"}}, order_by: {created_at: desc}) {
              id
              name
              repeat
              quest_reward_claimed
              description
              condition
              requirement
              reward
              status
              type
              repeat_quests(limit: 1, order_by: {created_at: desc}) {
                id
                quest_id
                created_at
              }
              created_at
              updated_at
            }
          }
        }
      }`,
      'queryAvailableQuests',
      {
        now: new Date(),
        user_id: userId
      }
    );

    if (errorOrEmpty(result, 'user_campaign')) {
      this.logger.error(JSON.stringify(result));
      return [];
    }

    const quests = [];
    result.data.user_campaign.forEach((userCampaign) => {
      quests.push(...userCampaign.user_campaign_campaign.campaign_quests)
    })

    return quests;
  }



  async queryUserLevel(variables) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query authorizer_users($id: bpchar!) {
        authorizer_users(where: {id: {_eq: $id}}) {
          levels {
            xp
            level
          }
        }
      }`,
      'authorizer_users',
      variables
    );

    return result.data.authorizer_users[0];
  }

  updateUserProfile(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateUserProfile($id: bpchar = "", $_set: authorizer_users_set_input = {bio: "", nickname: ""}) {
        update_authorizer_users(where: {id: {_eq: $id}}, _set: $_set) {
          affected_rows
          returning {
            email
            bio
            picture
            birthdate
          }
        }
      }
      `,
      'UpdateUserProfile',
      variables
    );
  }

  userReadChapter(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation insert_user_read_chapter($chapter_id: Int!) {
        insert_user_read_chapter(objects: {chapter_id: $chapter_id}, on_conflict: {constraint: user_read_chapter_pkey, update_columns: updated_at}) {
          returning {
            user_id
            chapter_id
            updated_at
          }
        }
      }
      `,
      'insert_user_read_chapter',
      variables
    );
  }
}

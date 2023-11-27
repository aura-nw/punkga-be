import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class QuestGraphql {
  private readonly logger = new Logger(QuestGraphql.name);

  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async likeChapter(variables: any): Promise<boolean> {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query query_like($chapter_id: Int!, $user_id: bpchar!) {
        likes(where: {chapter_id: {_eq: $chapter_id}, user_id: {_eq: $user_id}}) {
          id
          created_at
        }
      }`,
      'query_like',
      variables
    );

    if (this.graphqlSvc.errorOrEmpty(result, 'likes')) {
      return false;
    }

    return true;
  }

  async getUserReadChapterData(variables: any) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query user_read_chapter($user_id: bpchar!, $chapter_id: Int!, $compare_date: timestamptz = "") {
        user_read_chapter(where: {user_id: {_eq: $user_id}, chapter_id: {_eq: $chapter_id}, updated_at: {_gte: $compare_date}}) {
          user_id
          chapter_id
          updated_at
        }
      }      
      `,
      'user_read_chapter',
      variables
    );

    return result.data.user_read_chapter[0];
  }

  async getQuestDetail(variables: any) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query quests($id: Int!) {
        quests(where: {id: {_eq: $id}, status: {_eq: "Published"}}) {
          id
          name
          status
          type
          requirement
          reward
          created_at
          repeat_quests(order_by: {created_at: desc}, limit: 1) {
            id
            created_at
          }
        }
      }`,
      'quests',
      variables
    );

    return result.data.quests[0];
  }

  async getAllCampaignQuest() {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query getAllCampaignQuest {
        campaign(where: {status: {_eq: "Published"}, campaign_quests_aggregate: {count: {predicate: {_gt: 0}, filter: {status: {_eq: "Published"}}}}}, order_by: {created_at: desc}) {
          id
          name
          campaign_quests(order_by: {created_at: desc}, where: {status: {_eq: "Published"}}) {
            id
            name
            description
            condition
            requirement
            reward
            status
            type
            created_at
            updated_at
          }
        }
      }
      `,
      'getAllCampaignQuest',
      {}
    );

    return result.data.campaign;
  }

  async getRefQuest(questId: number, token: string) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query findRefQuest($_contains: jsonb!) {
        quests(where: {condition: {_contains: $_contains}}) {
          id
          name
        }
      }`,
      'findRefQuest',
      {
        _contains: {
          quest_id: questId,
        },
      }
    );

    return result.data.quests;
  }

  async deleteQuest(questId: number, token: string) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation delete_quests_by_pk ($id: Int!) {
        delete_quests_by_pk(id: $id) {
          campaign_id
          condition
          created_at
          id
          name
          requirement
          reward
          status
          type
          updated_at
        }
      }
      `,
      'delete_quests_by_pk',
      {
        id: questId,
      }
    );
  }
}

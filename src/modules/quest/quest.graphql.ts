import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';
import { errorOrEmpty } from '../graphql/utils';

@Injectable()
export class QuestGraphql {
  private readonly logger = new Logger(QuestGraphql.name);

  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async getUserQuest(quest: any, userId: string) {
    let queryUserQuestCondition;
    // check reward claimed
    if (quest.repeat === 'Once') {
      queryUserQuestCondition = {
        where: {
          quest_id: {
            _eq: quest.id,
          },
          user_id: {
            _eq: userId,
          },
        },
      };
    } else {
      // get latest repeat quest by quest id
      const repeatQuest = await this.queryRepeatQuest({
        quest_id: quest.id,
      });

      if (!repeatQuest) return false;

      queryUserQuestCondition = {
        where: {
          repeat_quest_id: {
            _eq: repeatQuest.id,
          },
          user_id: {
            _eq: userId,
          },
        },
      };
    }

    // query user quest
    const userQuest = await this.queryUserQuests(queryUserQuestCondition);

    return userQuest;
  }

  async queryUserQuests(variables: any) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query user_quest($where: user_quest_bool_exp = {_and: {}}) {
        user_quest(where: $where) {
          id
          user_quest_rewards {
            tx_hash
            id
            created_at
          }
        }
      }`,
      'user_quest',
      variables
    );

    return result.data.user_quest[0];
  }

  async queryRepeatQuest(variables: any) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query repeat_quests($quest_id: Int!) {
        repeat_quests(where: {quest_id: {_eq: $quest_id}}, order_by: {created_at: desc}, limit: 1) {
          id
          quest_id
          created_at
        }
      }`,
      'repeat_quests',
      variables
    );

    return result.data.repeat_quests[0];
  }

  async answerQuest(variables: any, userToken: string) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      userToken,
      `mutation insert_quest_activities($quest_activities: [quest_activities_insert_input!]!) {
        insert_quest_activities(objects: $quest_activities) {
          affected_rows
        }
      }`,
      'insert_quest_activities',
      variables
    );
  }

  async getUserAnswer(variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query quest_activities($where: quest_activities_bool_exp!) {
        quest_activities(where: $where, limit: 1, order_by: {updated_at: desc}) {
          id
          user_id
          quest_id
          repeat_quest_id
          created_at
          activity
        }
      }
      `,
      'quest_activities',
      variables
    );
  }

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

    if (errorOrEmpty(result, 'likes')) {
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
          repeat
          requirement
          reward
          created_at
          repeat_quests(order_by: {created_at: desc}, limit: 1) {
            id
            created_at
          }
          quest_reward_claimed
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
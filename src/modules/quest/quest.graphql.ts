import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';
import { errorOrEmpty } from '../graphql/utils';
import { IChainInfo } from './interface/ichain-info';

@Injectable()
export class QuestGraphql {
  private readonly logger = new Logger(QuestGraphql.name);

  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async getChainInfo(variables: any) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query chains_by_pk($id: Int!) {
        chains_by_pk(id: $id) {
          id
          name
          rpc
          contracts
          chain_id
          address_type
        }
      }`,
      'chains_by_pk',
      variables
    );

    return result.data.chains_by_pk as IChainInfo;
  }

  async getQuestDetailWithUserCampaign(variables: any) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query quests($id: Int!, $user_id: bpchar!) {
        quests(where: {id: {_eq: $id}, status: {_eq: "Published"}}) {
          id
          name
          status
          type
          repeat
          requirement
          reward
          campaign_id
          quests_campaign {
            chain_id
            campaign_user(where: {user_id: {_eq: $user_id}}) {
              id
            }
          }
          created_at
          repeat_quests(order_by: {created_at: desc}, limit: 1) {
            id
            created_at
          }
          quest_reward_claimed
        }
      }
      
      `,
      'quests',
      variables
    );

    return result.data.quests[0];
  }

  async saveUserCampaignReward(campaignId: number, userCampaignId: number) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_user_campaign_reward($campaign_id: Int!, $user_campaign_id: Int!) {
        insert_user_campaign_reward(objects: {campaign_id: $campaign_id, user_campaign_id: $user_campaign_id}) {
          affected_rows
          returning {
            id
          }
        }
      }`,
      'insert_user_campaign_reward',
      {
        campaign_id: campaignId,
        user_campaign_id: userCampaignId,
      },
      headers
    );
  }

  async getUserCampaignReward(id: number) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query user_campaign_reward($id: Int!) {
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
      'user_campaign_reward',
      {
        id,
      },
      headers
    );

    if (errorOrEmpty(result, 'user_campaign'))
      throw new ForbiddenException(result.errors);

    return result.data.user_campaign[0];
  }

  async updateUserCampaignRewardResult(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_user_campaign_reward($ids: [Int!], $tx_hash: String!) {
        update_user_campaign_reward(where: {id: {_in: $ids}}, _set: {tx_hash: $tx_hash}) {
          affected_rows
        }
      }`,
      'update_user_campaign_reward',
      variables,
      headers
    );

    return result;
  }

  async updateUserQuestResult(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_user_quest_reward($user_quest_id: [Int!], $tx_hash: String!) {
        update_user_quest_reward(where: {user_quest_id: {_in: $user_quest_id}}, _set: {tx_hash: $tx_hash}) {
          affected_rows
        }
      }`,
      'update_user_quest_reward',
      variables,
      headers
    );

    return result;
  }

  async insertRequestLog(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_request_log_one($data: jsonb = null, $unique_key: String!) {
        insert_request_log_one(object: {status: "CREATED", data: $data, unique_key: $unique_key}) {
          id
          data
          created_at
        }
      }`,
      'insert_request_log_one',
      variables,
      headers
    );

    return result;
  }

  async updateRequestLogs(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_request_log($ids: [Int!], $log: String, $status: String) {
        update_request_log(where: {id: {_in: $ids}}, _set: {log: $log, status: $status}) {
          affected_rows
        }
      }
      `,
      'update_request_log',
      variables,
      headers
    );

    return result;
  }

  async updateRequestLog(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_request_log_by_pk($id: Int!, $log: String!, $status: String!) {
        update_request_log_by_pk(pk_columns: {id: $id}, _set: {status: $status, log: $log}) {
          id
          data
          log
          status
        }
      }`,
      'update_request_log_by_pk',
      variables,
      headers
    );

    return result;

    // if (errorOrEmpty(result, 'insert_request_log_one')) throw new Error(`insert request fail: ${JSON.stringify(result)}`)

    // this.logger.debug(`insert request success ${JSON.stringify(result)}`)
    // return result.data.insert_request_log_one.id;
  }

  async queryPublicUserWalletData(variables: any) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query authorizer_users($id: bpchar!) {
        authorizer_users(where: {id: {_eq: $id}}) {
          id
          levels {
            level
            xp
          }
          wallet_address
          active_evm_address
          authorizer_users_user_wallet {
            address
          }
        }
      }`,
      'authorizer_users',
      variables
    );

    if (errorOrEmpty(result, 'authorizer_users')) throw new NotFoundException();

    return result.data.authorizer_users[0];
  }

  async queryUserWalletData(variables: any, token: string) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query authorizer_users($id: bpchar = "") {
        authorizer_users(where: {id: {_eq: $id}}) {
          id
          levels {
            level
            xp
          }
          authorizer_users_user_wallet {
            address
            data
            user_id
          }
        }
      }
      `,
      'authorizer_users',
      variables
    );

    if (errorOrEmpty(result, 'authorizer_users')) throw new NotFoundException();

    return result.data.authorizer_users[0];
  }

  async increaseUserCampaignXp(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation increaseUserCampaignXp($user_campaign_id: Int!, $reward_xp: Int!, $_eq: Int = 10) {
        update_user_campaign(where: {id: {_eq: $user_campaign_id}}, _inc: {total_reward_xp: $reward_xp}) {
          affected_rows
        }
      }`,
      'increaseUserCampaignXp',
      variables,
      headers
    );

    return result;
  }

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

    if (errorOrEmpty(result, 'user_read_chapter')) return undefined;

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
          campaign_id
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

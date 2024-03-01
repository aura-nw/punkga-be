import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class UserRewardGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) { }

  async insertUserQuest(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_user_quest($objects: [user_quest_insert_input!] = {quest_id: 10, repeat_quest_id: 10, status: "", user_id: "", user_quest_rewards: {data: {tx_hash: "", user_quest_id: 10}, on_conflict: {constraint: user_quest_reward_pkey, update_columns: updated_at}}}) {
        insert_user_quest(objects: $objects, on_conflict: {constraint: user_quest_pkey, update_columns: updated_at}) {
          affected_rows
          returning {
            id
          }
        }
      }`,
      'insert_user_quest',
      variables,
      headers
    );
  }

  async insertUserReward(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_user_quest($objects: [user_quest_insert_input!] = {quest_id: 10, repeat_quest_id: 10, status: "", user_id: "", user_quest_rewards: {data: {tx_hash: "", user_quest_id: 10}, on_conflict: {constraint: user_quest_reward_pkey, update_columns: updated_at}}}) {
        insert_user_quest(objects: $objects, on_conflict: {constraint: user_quest_pkey, update_columns: updated_at}) {
          affected_rows
        }
      }`,
      'insert_user_quest',
      variables,
      headers
    );
  }
}

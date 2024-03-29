import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class RepeatQuestsGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) { }

  async getRepeatableQuestById(variables: any) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query repeatable_quest_by_id($id: Int!) {
        quests(where: {id: {_eq: $id}, repeat: {_in: ["Daily"]}, status: {_eq: "Published"}}) {
          id
          condition
          type
          status
          repeat
          repeat_quests(limit: 1, order_by: {created_at: desc}) {
            id
            quest_id
            created_at
          }
        }
      }
      `,
      'repeatable_quest_by_id',
      variables
    );

    return result.data?.quests[0];
  }

  async getRepeatableQuests() {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query repeatable_quests {
        quests(where: {status: {_eq: "Published"}, repeat: {_eq: "Daily"}}) {
          id
          condition
          status
        }
      }`,
      'repeatable_quests',
      {}
    );

    return result.data.quests;
  }

  insertRepeatQuests(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_repeat_quests($objects: [repeat_quests_insert_input!] = {quest_id: 10}) {
        insert_repeat_quests(objects: $objects) {
          affected_rows
        }
      }`,
      'insert_repeat_quests',
      variables,
      headers
    );
  }
}

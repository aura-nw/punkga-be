import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class UserQuestsGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

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
}

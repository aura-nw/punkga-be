import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class UserLevelGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) { }

  insertUserLevel(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_user_level($level: Int!, $user_id: bpchar!, $xp: Int!) {
        insert_user_level(objects: {level: $level, user_id: $user_id, xp: $xp}, on_conflict: {constraint: user_level_pkey, update_columns: [level, xp]}) {
          affected_rows
          returning {
            user_id
            level
            xp
          }
        }
      }`,
      'insert_user_level',
      variables,
      headers
    );
  }
}

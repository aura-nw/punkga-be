import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TelegramGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  insertTelegramUser(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_telegram_users_one($object: telegram_users_insert_input = {}) {
        insert_telegram_users_one(object: $object, on_conflict: {constraint: telegram_users_telegram_id_key, update_columns: updated_at}) {
          id
        }
      }`,
      'insert_telegram_users_one',
      variables,
      headers
    );
  }
}

import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TelegramGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  getTelegramUser(variables) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query telegram_users_by_pk($id: Int!) {
        telegram_user: telegram_users_by_pk(id: $id) {
          id
          telegram_id
          username
          created_at
          authorizer_user {
            id
            nickname
            email
          }
        }
      }`,
      'telegram_users_by_pk',
      variables,
      headers
    );
  }

  saveDonateHistory(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_donate_history_one($object: donate_history_insert_input = {}) {
        insert_donate_history_one(object: $object) {
          telegram_user {
            telegram_id
            username
            authorizer_user {
              id
              nickname
            }
          }
          creator {
            id
            gender
            name
            avatar_url
            pen_name
            email
          }
          value
        }
      }
      `,
      'insert_donate_history_one',
      variables,
      headers
    );
  }

  updateTelegramUser(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_telegram_users_by_pk($id: Int!, $user_id: bpchar!) {
        telegram_user: update_telegram_users_by_pk(pk_columns: {id: $id}, _set: {user_id: $user_id}) {
          id
          telegram_id
          username
          authorizer_user {
            id
            nickname
            email
          }
        }
      }`,
      'update_telegram_users_by_pk',
      variables,
      headers
    );
  }
}

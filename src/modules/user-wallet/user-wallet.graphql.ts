import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class UserWalletGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) { }

  async insertManyUserWallet(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_user_wallet($objects: [user_wallet_insert_input!] = {}) {
        insert_user_wallet(objects: $objects, on_conflict: {constraint: user_wallet_user_id_key, update_columns: updated_at}) {
          affected_rows
        }
      }`,
      'insert_user_wallet',
      variables,
      headers
    );
    console.log(result);
    return result;
  }

  async queryAllUser(): Promise<any[]> {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query query_user_wallet($ids: [bpchar!] = "") {
        authorizer_users {
          id
        }
      }`,
      'query_user_wallet',
      {},
      headers
    );
    return result.data.authorizer_users;
  }

  async queryEmptyUserWallet() {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const queryResult = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query query_user_wallet {
        user_wallet(where: {is_master_wallet: {_eq: false}}) {
          user_id
        }
      }
      `,
      'query_user_wallet',
      {},
      headers
    );

    const existUsersId = queryResult.data.user_wallet.map(
      (info) => info.user_id
    );

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query query_user_wallet($ids: [bpchar!] = "") {
        authorizer_users(where: {id: {_nin: $ids}}, limit: 10) {
          id
        }
      }`,
      'query_user_wallet',
      {
        ids: existUsersId,
      },
      headers
    );
    return result.data.authorizer_users;
  }

  async getMasterWallet() {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query query_user_wallet {
        user_wallet(where: {is_master_wallet: {_eq: true}}) {
          address
          data
        }
      }
      `,
      'query_user_wallet',
      {},
      headers
    );

    return result.data.user_wallet[0];
  }
}

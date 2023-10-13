import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class UserWalletGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  insertUserWallet(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_user_wallet($address: String = "", $data: String = "", $is_master_wallet: Boolean = false, $user_id: bpchar = "") {
        insert_user_wallet(objects: {address: $address, data: $data, is_master_wallet: $is_master_wallet, user_id: $user_id}) {
          returning {
            id
            address
            data
            is_master_wallet
            user_id
          }
          affected_rows
        }
      }`,
      'insert_user_wallet',
      variables,
      headers
    );
  }
}

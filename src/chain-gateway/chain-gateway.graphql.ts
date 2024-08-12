import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { GraphqlService } from '../modules/graphql/graphql.service';

@Injectable()
export class ChainGatewayGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async updateGranterWallet(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_system_custodial_wallet_by_pk($id: Int!, $data: system_custodial_wallet_set_input = {}) {
        update_system_custodial_wallet_by_pk(pk_columns: {id: $id}, _set: $data) {
          id
        }
      }`,
      'update_system_custodial_wallet_by_pk',
      variables,
      headers
    );

    return result;
  }

  async insertGranterWallet(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_system_custodial_wallet($objects: [system_custodial_wallet_insert_input!] = {}) {
        insert_system_custodial_wallet(objects: $objects) {
          affected_rows
        }
      }
      `,
      'insert_system_custodial_wallet',
      variables,
      headers
    );

    return result;
  }

  async getGranterWallet(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query system_custodial_wallet($chain: String!) {
        system_custodial_wallet(where: {type: {_eq: "GRANTER"}, chain: {_eq: $chain}}) {
          id
          address
          data
          cipher_prv_key
          public_key
        }
      }
      `,
      'system_custodial_wallet',
      variables,
      headers
    );

    return result.data.system_custodial_wallet[0];
  }
}

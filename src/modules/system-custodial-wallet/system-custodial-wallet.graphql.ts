import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SystemCustodialWalletGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async insertSystemCustodialWallet(variables: any) {
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

  async getGranterWallet() {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query system_custodial_wallet {
        system_custodial_wallet(where: {type: {_eq: "GRANTER"}}) {
          address
          data
        }
      }
      `,
      'system_custodial_wallet',
      {},
      headers
    );

    return result.data.system_custodial_wallet[0];
  }

  async getSSPWallet() {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query system_custodial_wallet {
        system_custodial_wallet(where: {type: {_eq: "SSP"}}) {
          address
          data
        }
      }
      `,
      'system_custodial_wallet',
      {},
      headers
    );

    return result.data.system_custodial_wallet[0];
  }
}

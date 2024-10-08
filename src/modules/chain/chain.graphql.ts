import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class ChainGraphql {
  constructor(
    private configService: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async createChain(variables: any, token: string) {
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `mutation insert_chains_one($object: chains_insert_input = {}) {
        insert_chains_one(object: $object) {
          id
          name
          rpc
          chain_id
          address_type
          created_at
        }
      }`,
      'insert_chains_one',
      variables
    );
  }

  insertCustodialAddress(variables: any, token: string) {
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `mutation insert_custodial_wallet_address($objects: [custodial_wallet_address_insert_input!] = {}) {
        insert_custodial_wallet_address(objects: $objects) {
          affected_rows
        }
      }      
      `,
      'insert_custodial_wallet_address',
      variables
    );
  }
}

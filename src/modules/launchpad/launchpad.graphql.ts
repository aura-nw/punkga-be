import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LaunchpadGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) { }

  insert(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_launchpad_one($data: launchpad_insert_input = {}) {
        insert_launchpad_one(object: $data) {
          id
        }
      }`,
      'insert_launchpad_one',
      variables,
      headers
    );
  }

  update(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_launchpad_by_pk($data: launchpad_set_input = {}, $id: Int!) {
        update_launchpad_by_pk(pk_columns: {id: $id}, _set: $data) {
          updated_at
        }
      }`,
      'update_launchpad_by_pk',
      variables,
      headers
    );
  }

  queryByPk(variables: any, token: string) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query launchpad_by_pk($id: Int!) {
        launchpad_by_pk(id: $id) {
          id
          name
          thumbnail_url
          description
          max_supply
          start_date
          end_date
          mint_price
          max_mint_per_address
          nft_images
          metadata_uri_base
          metadata_contract_uri
          status
        }
      }`,
      'launchpad_by_pk',
      variables
    )
  }

  queryCreatorAddress(variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query authorizer_users_by_pk($id: bpchar = "") {
        authorizer_users_by_pk(id: $id) {
          wallet_address
        }
      }`,
      'authorizer_users_by_pk',
      variables
    )
  }

}

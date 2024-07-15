import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LaunchpadGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  getOwnedLaunchpadDetail(variables: any, token) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query launchpad_by_pk($id: Int!) {
        launchpad_by_pk(id: $id) {
          contract_address
          created_at
          creator_address
          creator_id
          description
          end_date
          featured_images
          license_token_id
          license_token_address
          id
          logo_url
          max_mint_per_address
          max_supply
          metadata_contract_uri
          metadata_uri_base
          mint_price
          name
          nft_images
          royalties
          start_date
          status
          thumbnail_url
          updated_at
        }
      }
      `,
      'launchpad_by_pk',
      variables
    );
  }

  listOwnedLaunchpad(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query launchpad($user_id: bpchar!) {
        launchpad(where: {creator_id: {_eq: $user_id}}) {
          id
          name
          license_token_id
          status
          start_date
          end_date
          created_at
          updated_at
        }
      }
      `,
      'launchpad',
      variables,
      headers
    );
  }

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
          creator_id
        }
      }`,
      'launchpad_by_pk',
      variables
    );
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
    );
  }

  async insertI18n(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    console.log(variables);
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_i18n($objects: [i18n_insert_input!] = {}) {
          insert_i18n(on_conflict: {constraint: i18n_launchpad_id_language_id_key, update_columns: data}, objects: $objects) {
          affected_rows
        }
        }`,
      'insert_i18n',
      variables,
      headers
    );
  }
}

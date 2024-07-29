import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LaunchpadGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  getLaunchpadDetail(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query launchpad_by_pk($launchpad_id: Int!, $language_id: Int!) {
        launchpad_by_pk(id: $launchpad_id) {
          created_at
          creator_id
          featured_images
          id
          status
          updated_at
          launchpad_creator {
            wallet_address
            name
          }
          launchpad_i18ns(where: {language_id: {_eq: $language_id}}) {
            data
          }
          contract_address
        }
      }
      `,
      'launchpad_by_pk',
      variables,
      headers
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

  queryByPk(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query launchpad_by_pk($id: Int!) {
        launchpad_by_pk(id: $id) {
          id
          created_at
          creator_id
          featured_images
          id
          status
          updated_at
          contract_address
          fund
          launchpad_i18ns {
            id
            language_id
            data
          }
        }
      }`,
      'launchpad_by_pk',
      variables,
      headers
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

  getListLaunchpad(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query launchpad($offset: Int = 0, $limit: Int = 10, $status: [String] = ["DRAFT", "PUBLISHED", "READY_TO_MINT"]) {
        launchpad(offset: $offset, limit: $limit, order_by: {updated_at: desc}, where: {status: {_in: $status}}) {
          featured_images
          id
          launchpad_creator {
            wallet_address
            name
            avatar_url
            bio
            slug
            pen_name
          }
          launchpad_i18ns {
            data
            language_id
          }
          updated_at
          contract_address
          creator_id
        }
      }
      `,
      'launchpad',
      variables,
      headers
    );
  }
}

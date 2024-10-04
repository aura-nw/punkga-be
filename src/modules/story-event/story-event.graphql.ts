import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class StoryEventGraphql {
  private readonly logger = new Logger(StoryEventGraphql.name);

  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async getStoryChain() {
    // story chain id = 3
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query chains_by_pk {
        chains_by_pk(id: 3) {
          id
          rpc
          contracts
        }
      }`,
      'chains_by_pk',
      {}
    );
    if (result.errors || result.data.chains_by_pk === null)
      throw new NotFoundException('cannot find story chain in config');

    return result.data.chains_by_pk;
  }

  async queryUserAddress(token: string): Promise<string> {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query GetUserProfile {
        authorizer_users(limit: 1) {
          id
          active_wallet_address: active_evm_address
        }
      }
      `,
      'GetUserProfile',
      {}
    );

    if (result.data.authorizer_users[0]?.active_wallet_address) {
      return result.data.authorizer_users[0]?.active_wallet_address;
    } else {
      throw new NotFoundException('wallet address not found');
    }
  }

  async insertStoryIPA(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_story_ip_asset_one($object: story_ip_asset_insert_input = {}) {
        insert_story_ip_asset_one(object: $object) {
          id
        }
      }`,
      'insert_story_ip_asset_one',
      variables,
      headers
    );
  }

  async updateSubmission(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_story_event_submission_by_pk($id: Int!, $status: String!) {
        update_story_event_submission_by_pk(pk_columns: {id: $id}, _set: {status: $status}) {
          id
          status
        }
      }
      `,
      'update_story_event_submission_by_pk',
      variables,
      headers
    );
  }

  async updateCharacter(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_story_character_by_pk($id: Int!, $story_ip_asset_id: Int!) {
        update_story_character_by_pk(pk_columns: {id: $id}, _set: {story_ip_asset_id: $story_ip_asset_id}) {
          id
          story_ip_asset_id
        }
      }
      `,
      'update_story_character_by_pk',
      variables,
      headers
    );
  }

  async insertStoryCharacter(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_story_character_one($object: story_character_insert_input = {}) {
        insert_story_character_one(object: $object) {
          id
        }
      }
      `,
      'insert_story_character_one',
      variables,
      headers
    );
  }

  async insertSubmission(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_story_event_submission_one($object: story_event_submission_insert_input = {}) {
        insert_story_event_submission_one(object: $object) {
          id
        }
      }`,
      'insert_story_event_submission_one',
      variables,
      headers
    );
  }

  async queryApprovedCharacters() {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query story_character {
        story_character(where: {status: {_eq: "Approved"}}, order_by: {is_default_character: desc}) {
          id
          avatar_url
          descripton_url
          is_default_character
          name
          status
          authorizer_user {
            id
            nickname
          }
          story_ip_asset {
            id
            ip_asset_id
          }
        }
      }
      `,
      'story_character',
      {},
      headers
    );
  }
}

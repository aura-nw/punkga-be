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

  async updateStoryArtwork(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_story_artwork_by_pk($id: Int!, $story_ip_asset_id: Int!) {
        update_story_artwork_by_pk(pk_columns: {id: $id}, _set: {story_ip_asset_id: $story_ip_asset_id}) {
          id
          story_ip_asset_id
        }
      }
      `,
      'update_story_artwork_by_pk',
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

  async querUserSubmissions(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query story_event_submission($user_id: bpchar!) {
        story_event_submission(where: {user_id: {_eq: $user_id}}, order_by: {created_at: desc}) {
          id
          name
          type
          created_at
        }
      }
      `,
      'story_event_submission',
      variables,
      headers
    );
  }

  async queryApprovedCharacters(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query story_character($user_id: bpchar = "") {
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
          likes(where: {user_id: {_eq: $user_id}}) {
            created_at
            id
          }
          likes_aggregate {
            aggregate {
              count
            }
          }
          user_collect_characters(where: {user_id: {_eq: $user_id}}) {
            id
            created_at
          }
          user_collect_characters_aggregate {
            aggregate {
              count
            }
          }
        }
      }
      `,
      'story_character',
      variables,
      headers
    );
  }

  async queryCollectedCharacters(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query user_collect_character($user_id: bpchar!) {
        user_collect_character(where: {user_id: {_eq: $user_id}}) {
          story_character {
            id
            avatar_url
            descripton_url
          }
        }
        user_collect_character_aggregate(where: {user_id: {_eq: $user_id}}) {
          aggregate {
            count
          }
        }
      }`,
      'user_collect_character',
      variables,
      headers
    );
  }

  async countCollectedCharacterByUserId(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query user_collect_character_aggregate($user_id: bpchar!) {
        user_collect_character_aggregate(where: {user_id: {_eq: $user_id}}) {
          aggregate {
            count
          }
        }
      }`,
      'user_collect_character_aggregate',
      variables,
      headers
    );
  }

  async insertUserCollectCharacter(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_user_collect_character_one($object: user_collect_character_insert_input = {}) {
        insert_user_collect_character_one(object: $object) {
          id
          story_character_id
          user_id
          created_at
        }
      }
      `,
      'insert_user_collect_character_one',
      variables,
      headers
    );
  }

  async insertArtwork(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_artworks_one($object: artworks_insert_input = {}) {
        insert_artworks_one(object: $object) {
          id
        }
      }
      `,
      'insert_artworks_one',
      variables,
      headers
    );
  }

  async insertStoryArtwork(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_story_artwork_one($object: story_artwork_insert_input = {}) {
        insert_story_artwork_one(object: $object) {
          id
        }
      }
      `,
      'insert_story_artwork_one',
      variables,
      headers
    );
  }

  async queryStoryCharacters(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query story_character($story_character_ids: [Int!]!) {
        story_character(where: {id: {_in: $story_character_ids}}) {
          id
          story_ip_asset {
            ip_asset_id
            id
          }
        }
      }`,
      'story_character',
      variables,
      headers
    );
  }
}

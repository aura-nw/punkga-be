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

  async updateSubmissions(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_story_event_submission($ids: [Int!] = 10, $_set: story_event_submission_set_input = {}) {
        update_story_event_submission(where: {id: {_in: $ids}}, _set: $_set) {
          affected_rows
        }
      }
      `,
      'update_story_event_submission',
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

  async updateStoryCharacterStatus(variables: any, token: string) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation update_story_character($ids: [Int!]!, $status: String!) {
        update_story_character(where: {id: {_in: $ids}}, _set: {status: $status}) {
          affected_rows
        }
      }
      `,
      'update_story_character',
      variables
    );
  }

  async getSubmittedCharacter(token: string) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query story_character {
        story_character(where: {status: {_eq: "Submitted"}}) {
          id
          name
          avatar_url
          descripton_url
          created_at
          authorizer_user {
            id
            email
            nickname
            picture
          }
        }
      }
      `,
      'story_character',
      {}
    );
  }
  async getSubmittedManga(token: string) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query story_event_submission {
        story_event_submission(where: {type: {_eq: "manga"}, status: {_eq: "Submitted"}}, order_by: {id: asc}) {
          id
          name
          status
          created_at
          data
          authorizer_user {
            id
            creator {
              pen_name
              id
            }
          }
        }
      }
      `,
      'story_event_submission',
      {}
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
      `mutation update_story_artwork_by_pk($id: Int!, $_set: story_artwork_set_input = {}) {
        update_story_artwork_by_pk(pk_columns: {id: $id}, _set: $_set) {
          id
          artwork_id
          story_ip_asset_id
        }
      }
      `,
      'update_story_artwork_by_pk',
      variables,
      headers
    );
  }

  async updateStoryManga(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_story_manga_by_pk($id: Int!, $story_ip_asset_id: Int!) {
        update_story_manga_by_pk(pk_columns: {id: $id}, _set: {story_ip_asset_id: $story_ip_asset_id}) {
          id
          story_ip_asset_id
        }
      }`,
      'update_story_manga_by_pk',
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
          status
          created_at
        }
      }
      `,
      'story_event_submission',
      variables,
      headers
    );
  }

  async queryApprovedCharacters(
    variables: any,
    where: string[],
    orderBy: string[]
  ) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query story_character($user_id: bpchar = "", $limit: Int = 10, $offset: Int = 0) {
        story_character_aggregate(where: {${where.join(',')}}) {
          aggregate {
            count
          }
        }
        story_character(where: {${where.join(',')}}, order_by: [${orderBy.join(
        ','
      )}], limit: $limit, offset: $offset) {
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

  async queryMangas(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query story_manga($limit: Int = 100, $offset: Int = 0) {
        story_manga_aggregate(where: {manga: {status: {_eq: "On-Going"}}}) {
          aggregate {
            count
          }
        }
        story_manga(where: {manga: {status: {_eq: "On-Going"}}}, limit: $limit, offset: $offset) {
          id
          manga {
            id
            slug
            banner
            poster
            manga_total_likes {
              likes
            }
            manga_creators {
              id
              creator {
                id
                slug
                pen_name
                avatar_url
              }
            }
            manga_languages {
              id
              title
              description
              language_id
              is_main_language
            }
          }
          story_ip_asset {
            ip_asset_id
          }
          story_manga_characters {
            story_character {
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
              likes_aggregate {
                aggregate {
                  count
                }
              }
              user_collect_characters_aggregate {
                aggregate {
                  count
                }
              }
            }
          }
          created_at
        }
      }
      `,
      'story_manga',
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

  async getCharacters(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query story_character($ids: [Int!]!) {
        story_character(where: {id: {_in: $ids}}) {
          id
          name
          user_id
          ipfs_url
          story_event_submission_id
          authorizer_user {
            active_evm_address
          }
        }
      }`,
      'story_character',
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

  async insertStoryManga(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_story_manga($object: story_manga_insert_input = {}) {
        insert_story_manga_one(object: $object) {
          id
        }
      }`,
      'insert_story_manga',
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

  async queryAvailableCharacters(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query availableCharacter($user_id: bpchar) {
        default: story_character(where: {is_default_character: {_eq: true}, status: {_eq: "Approved"}}) {
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
        collected: story_character(where: {user_collect_characters: {user_id: {_eq: $user_id}}, , status: {_eq: "Approved"}}) {
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
        user_ip: story_character(where: {user_id: {_eq: $user_id}, status: {_eq: "Approved"}}) {
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
      'availableCharacter',
      variables,
      headers
    );
  }

  async getSubmissionDetail(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query story_event_submission_by_pk($id: Int!) {
        story_event_submission_by_pk(id: $id) {
          id
          data
          name
          status
          type
        }
      }`,
      'story_event_submission_by_pk',
      variables,
      headers
    );

    return result.data.story_event_submission_by_pk;
  }

  async getStoryArtworks(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query story_artwork($story_artwork_ids: [Int!]!) {
        story_artwork(where: {id: {_in: $story_artwork_ids}}) {
          id
          name
          ipfs_url
          display_url
          story_submission_id
          story_artwork_characters {
            story_character {
              story_ip_asset {
                ip_asset_id
              }
            }
          }
          authorizer_user {
            active_evm_address
            creator {
              id
            }
          }
          user_id
          story_ip_asset {
            ip_asset_id
            id
          }
        }
      }
      `,
      'story_artwork',
      variables,
      headers
    );

    return result;
  }

  async insertArtworkCharacters(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_story_artwork_characters($objects: [story_artwork_character_insert_input!] = {}) {
        insert_story_artwork_character(objects: $objects) {
          affected_rows
        }
      }
      `,
      'insert_story_artwork_characters',
      variables,
      headers
    );
  }

  async updateArtworkStatus(variables: any, token: string) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation update_story_artwork($ids: [Int!]!, $status: String!) {
        update_story_artwork(where: {id: {_in: $ids}}, _set: {status: $status}) {
          affected_rows
        }
      }
      `,
      'update_story_artwork',
      variables
    );
  }
}

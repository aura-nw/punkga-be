import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class StoryProtocolGraphql {
  private readonly logger = new Logger(StoryProtocolGraphql.name);

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

  async queryStoryArtwork(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query story_artwork($limit: Int = 20, $offset: Int = 0) {
        story_artwork(limit: $limit, offset: $offset, order_by: {updated_at: desc}) {
          artwork_id
          created_at
          id
          ipfs_url
          story_ip_asset_id
          updated_at
          story_artwork_story_ip_asset {
            id
            ip_asset_id
            nft_contract_address
            nft_token_id
            user_id
            updated_at
            created_at
          }
        }
        story_artwork_aggregate {
          aggregate {
            count(columns: id)
          }
        }
      }
      `,
      'story_artwork',
      variables,
      headers
    );
  }

  async queryStoryArtworkByIds(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query story_artwork($id: [Int!] = []) {
        story_artwork(where: {id: {_in: $id}}) {
          artwork_id
          created_at
          id
          ipfs_url
          story_ip_asset_id
          updated_at
          story_artwork_story_ip_asset {
            id
            ip_asset_id
            nft_contract_address
            nft_token_id
            user_id
            updated_at
            created_at
          }
        }
      }
      `,
      'story_artwork',
      variables,
      headers
    );
  }

  async insertStoryCollection(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_story_collection_for_access_protocol($objects: [story_collection_for_access_protocol_insert_input!] = {}) {
        insert_story_collection_for_access_protocol(objects: $objects) {
          affected_rows
          returning {
            id
            }
            }
            }`,
      'insert_story_collection_for_access_protocol',
      variables,
      headers
    );
  }
  async queryStoryCollectionByPK(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query story_collection_for_access_protocol_by_pk($id: Int!) {
        story_collection_for_access_protocol_by_pk(id: $id) {
          avatar
          contract_address
          created_at
          description
          id
          name
          symbol
          updated_at
        }
      }
      `,
      'story_collection_for_access_protocol_by_pk',
      variables,
      headers
    );
  }

  async insertStoryIP(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_story_ip_for_access_protocol($objects: [story_ip_for_access_protocol_insert_input!] = {}) {
        insert_story_ip_for_access_protocol(objects: $objects) {
          affected_rows
          returning {
            id
          }
        }
      }`,
      'insert_story_ip_for_access_protocol',
      variables,
      headers
    );
  }

  async queryIPOfStoryCollectionByPK(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query story_collection_for_access_protocol_by_pk($id: Int!) {
        story_collection_for_access_protocol_by_pk(id: $id) {
          contract_address
          avatar
          created_at
          description
          id
          name
          symbol
          updated_at
          story_collection_ip {
            collection_id
            contract_address
            id
            ip_meatadata_hash
            ip_metadata_uri
            ipid
            nft_id
            nft_metadata_hash
            nft_metadata_uri
            parent_ipid
            owner
            status
            txhash
          }
          story_collection_ip_aggregate {
            aggregate {
              count(columns: id)
            }
          }
        }
      }
      `,
      'story_collection_for_access_protocol_by_pk',
      variables,
      headers
    );
  }
}

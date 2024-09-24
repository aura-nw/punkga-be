import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class ArtworkGraphql {
  constructor(
    private configService: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  insertArtworks(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configService.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `mutation insert_artworks($objects: [artworks_insert_input!] = {}) {
        insert_artworks(objects: $objects) {
          affected_rows
        }
      }`,
      'insert_artworks',
      variables,
      headers
    );
  }

  async insertArtwork(variables: any, token: string) {
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `mutation insert_artworks($objects: [artworks_insert_input!] = {}) {
        insert_artworks(objects: $objects) {
          affected_rows
          returning {
            contest_id
            creator_id
            url
          }
        }
      }`,
      'insert_artworks',
      variables
    );
  }

  async getCreatorAlbum(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configService.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `query albums($id: Int!, $creator_id: Int!) {
        albums(where: {id: {_eq: $id}, creator_id: {_eq: $creator_id}}) {
          id
        }
      }`,
      'albums',
      variables,
      headers
    );
  }

  async insertCreator(variables: any, token: string) {
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `mutation insert_creators_one($object: creators_insert_input = {}) {
        insert_creators_one(object: $object, on_conflict: {constraint: creators_pen_name_key, update_columns: updated_at}) {
          id
        }
      }`,
      'insert_creators_one',
      variables
    );
  }

  async updateArtwork(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configService.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `mutation update_artworks($id: Int!, $creator_id: Int!, $data: artworks_set_input = {}) {
        update_artworks(where: {id: {_eq: $id}, creator_id: {_eq: $creator_id}}, _set: $data) {
          affected_rows
        }
      }`,
      'update_artworks',
      variables,
      headers
    );
  }

  async deleteArtworks(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configService.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `mutation delete_artworks($ids: [Int!], $creator_id: Int!) {
        delete_artworks(where: {id: {_in: $ids}, creator_id: {_eq: $creator_id}}) {
          affected_rows
        }
      }`,
      'delete_artworks',
      variables,
      headers
    );
  }
}

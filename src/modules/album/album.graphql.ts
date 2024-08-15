import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AlbumGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  getListAlbum(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query list_album($creator_id: Int!, $limit: Int = 0, $offset: Int = 20) {
        default_album: albums_by_pk(id: 1) {
          name
          show
          disable
          created_at
          artworks_aggregate(where: {creator_id: {_eq: $creator_id}}) {
            aggregate {
              count
            }
          }
        }
        albums(where: {creator_id: {_eq: $creator_id}}, limit: $limit, offset: $offset) {
          name
          show
          disable
          created_at
          artworks_aggregate {
            aggregate {
              count
            }
          }
        }
      }
      `,
      'list_album',
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
      `mutation insert_albums_one($object: albums_insert_input = {}) {
        insert_albums_one(object: $object) {
          id
        }
      }`,
      'insert_albums_one',
      variables,
      headers
    );
  }

  insertArtworks(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
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

  update(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_albums_by_pk($id: Int!, $data: albums_set_input = {}) {
        update_albums_by_pk(pk_columns: {id: $id}, _set: $data) {
          updated_at
        }
      }`,
      'update_albums_by_pk',
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
          status
          contract_address
          fund
          id
          slug
          launchpad_creator {
            avatar_url
            bio
            name
            pen_name
            slug
            wallet_address
          }
          launchpad_i18ns {
            id
            language_id
            data
          }
          featured_images
          creator_id
        }
      }`,
      'launchpad_by_pk',
      variables,
      headers
    );
  }

  queryBySlug(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query launchpad($slug: String!) {
        launchpad(where: {slug: {_eq: $slug}}) {
          status
          contract_address
          fund
          id
          slug
          launchpad_creator {
            avatar_url
            bio
            name
            pen_name
            slug
            wallet_address
          }
          launchpad_i18ns {
            id
            language_id
            data
          }
          featured_images
          creator_id
        }
      }`,
      'launchpad',
      variables,
      headers
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

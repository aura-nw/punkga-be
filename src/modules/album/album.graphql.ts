import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AlbumGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  countArtworkInDefault(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query artworks_aggregate($creator_id: Int!) {
        artworks_aggregate(where: {id: {_eq: 1}, creator_id: {_eq: $creator_id}}) {
          aggregate {
            count
          }
        }
      }
      `,
      'artworks_aggregate',
      variables,
      headers
    );
  }

  getPublicAlbumsWithDefaultAlbum(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query albums($creator_id: Int!, $limit: Int = 100, $offset: Int = 0) {
        albums(where: {_or: [{_and: {id: {_eq: 1}, show: {_eq: true}}}, {_and: {creator_id: {_eq: $creator_id}, show: {_eq: true}}}]}, limit: $limit, offset: $offset) {
          id
          show
          thumbnail_url
          name
          disable
        }
        albums_aggregate(where: {_or: [{_and: {id: {_eq: 1}, show: {_eq: true}}}, {_and: {creator_id: {_eq: $creator_id}, show: {_eq: true}}}]}) {
          aggregate {
            count
          }
        }
      }
      `,
      'albums',
      variables,
      headers
    );
  }

  getPublicAlbums(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query albums($creator_id: Int!, $limit: Int = 100, $offset: Int = 0) {
        albums(where: {_and: {creator_id: {_eq: $creator_id}, show: {_eq: true}}}, limit: $limit, offset: $offset) {
          id
          show
          thumbnail_url
          name
          disable
        }
        albums_aggregate(where: {_and: {creator_id: {_eq: $creator_id}, show: {_eq: true}}}) {
          aggregate {
            count
          }
        }
      }
      `,
      'albums',
      variables,
      headers
    );
  }

  getListAlbum(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query list_album($name: String = "%%", $limit: Int = 100, $offset: Int = 0, $creator_id: Int!) {
        default_album: albums_by_pk(id: 1) {
          id
          name
          show
          disable
          thumbnail_url
          created_at
          artworks_aggregate(where: {creator_id: {_eq: $creator_id}}) {
            aggregate {
              count
            }
          }
        }
        albums_aggregate(where: {name: {_ilike: $name}, creator_id: {_eq: $creator_id}}) {
          aggregate {
            count
          }
        }
        albums(where: {name: {_ilike: $name}, creator_id: {_eq: $creator_id}}, offset: $offset, limit: $limit) {
          id
          name
          show
          disable
          thumbnail_url
          created_at
          artworks_aggregate(where: {creator_id: {_eq: $creator_id}}) {
            aggregate {
              count
            }
          }
        }
      }`,
      'list_album',
      variables,
      headers
    );
  }

  albumDetail(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query album_detail($id: Int!, $creator_id: Int!) {
        albums(where: {id: {_eq: $id}, creator_id: {_eq: $creator_id}}) {
          id
          name
          description
          thumbnail_url
          show
          disable
          artworks {
            id
            name
            url
            created_at
          }
        }
      }
      `,
      'album_detail',
      variables,
      headers
    );
  }

  defaultAlbumDetail(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query album_detail($id: Int!, $creator_id: Int!) {
        albums(where: {id: {_eq: $id}}) {
          id
          name
          description
          thumbnail_url
          show
          disable
          artworks(where: {creator_id: {_eq: $creator_id}}) {
            id
            name
            url
            created_at
          }
        }
      }      
      `,
      'album_detail',
      variables,
      headers
    );
  }

  albumByPk(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query albums_by_pk($id: Int!) {
        albums_by_pk(id: $id) {
          creator_id
          artworks_aggregate {
            aggregate {
              count
            }
          }
        }
      }`,
      'albums_by_pk',
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

  delete(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation delete_albums_by_pk($id: Int!) {
        delete_albums_by_pk(id: $id) {
          id
        }
      }`,
      'delete_albums_by_pk',
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
      `mutation update_albums_by_pk($id: Int!, $data: albums_set_input = {}, $creator_id: Int!) {
        update_albums(where: {id: {_eq: $id}, creator_id: {_eq: $creator_id}}, _set: $data) {
          affected_rows
        }
      }
      `,
      'update_albums_by_pk',
      variables,
      headers
    );
  }
}

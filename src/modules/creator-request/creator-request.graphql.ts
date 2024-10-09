import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class CreatorRequestGraphql {
  private readonly logger = new Logger(CreatorRequestGraphql.name);

  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  createNewCreatorRequest(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation insert_creator_request_one($object: creator_request_insert_input = {}) {
        insert_creator_request_one(object: $object) {
          id
        }
      }`,
      'insert_creator_request_one',
      variables
    );
  }

  getCreatorRequestByCreatorAndStatus(creator_id: number, status: string) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    const variables = {
      creator_id,
      status,
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query creator_request($creator_id: Int!, $status: String!) {
        creator_request(where: {creator_id: {_eq: $creator_id}, status: {_eq: $status}, order_by: {updated_at: desc}}) {
          id
          creator_id
          data
          manga_id
          status
          type
          updated_at
          creator {
            pen_name
            name
          }
          manga {
            banner
            contest_id
            created_at
            id
            is_active
            latest_published
            nearest_upcoming
            poster
            publish_date
            release_date
            slug
            status
            updated_at
          }
        }
      }
      `,
      'creator_request',
      variables,
      headers
    );
  }

  getCreatorRequestByPK(id: number) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    const variables = {
      id,
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query creator_request_by_pk($id: Int!) {
        creator_request_by_pk(id: $id) {
          id
          data
          manga_id
          chapter_id
          status
          type
          updated_at
          creator_id
          created_at
        }
      }
      `,
      'creator_request_by_pk',
      variables,
      headers
    );
  }

  adminUpdateCreatorRequestByPK(id: number, requestInfo: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    const variables = {
      id,
      object: requestInfo,
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_creator_request_by_pk($id: Int!, $object: creator_request_set_input!) {
        update_creator_request_by_pk(pk_columns: {id: $id}, _set: $object) {
          creator_id
          data
          id
          status
          type
          updated_at
          manga_id
          created_at
        }
      }
      `,
      'update_creator_request_by_pk',
      variables,
      headers
    );
  }

  adminCreateNewCreatorRequest(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_creator_request_one($object: creator_request_insert_input = {}) {
        insert_creator_request_one(object: $object) {
          id
        }
      }`,
      'insert_creator_request_one',
      variables,
      headers
    );
  }
}

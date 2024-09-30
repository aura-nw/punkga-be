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
      `query creator_request($creator_id: Int = 10, $status: String!) {
        creator_request(where: {creator_id: {_eq: $creator_id}, status: {_eq: $status}}) {
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
}

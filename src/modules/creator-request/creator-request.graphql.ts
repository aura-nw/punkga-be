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
}

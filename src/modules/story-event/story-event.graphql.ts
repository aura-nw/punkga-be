import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class StoryEventGraphql {
  private readonly logger = new Logger(StoryEventGraphql.name);

  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async queryRequest(variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query request_log_by_pk($id: Int!) {
        request_log_by_pk(id: $id) {
          log
          status
        }
      }`,
      'request_log_by_pk',
      variables
    );
  }
}

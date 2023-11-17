import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class SubscribersGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  querySubscribers(variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query subscribers($user_id: bpchar!, $manga_id: Int!) {
        subscribers(where: {manga_id: {_eq: $manga_id}, user_id: {_eq: $user_id}}) {
          id
          manga_id
          created_at
          user_id
        }
      }      
      `,
      'subscribers',
      variables
    );
  }
}

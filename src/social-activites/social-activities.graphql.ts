import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class SocialActivitiesGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  queryActivities(variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query social_activities($chapter_id: Int!, $user_id: bpchar!) {
        social_activities(where: {_and: [{chapter_id: {_eq: $chapter_id}}, {user_id: {_eq: $user_id}}]}) {
          id
          content
          user_id
          chapter_id
        }
      }
      `,
      'social_activities',
      variables
    );
  }
}

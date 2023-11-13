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
      `query social_activities($chapter_id: Int!, $user_id: bpchar!, $created_at: timestamptz!) {
        social_activities(where: {_and: [{chapter_id: {_eq: $chapter_id}}, {user_id: {_eq: $user_id}}, {created_at: {_gt: $created_at}}]}, limit: 1) {
          id
          content
          user_id
          chapter_id
          created_at
        }
      }
      `,
      'social_activities',
      variables
    );
  }
}

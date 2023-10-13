import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class UserGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  updateUserProfile(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateUserProfile($id: bpchar = "", $_set: authorizer_users_set_input = {bio: "", nickname: ""}) {
        update_authorizer_users(where: {id: {_eq: $id}}, _set: $_set) {
          affected_rows
          returning {
            email
            bio
            picture
            birthdate
          }
        }
      }
      `,
      'UpdateUserProfile',
      variables
    );
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class UserGraphql {
  private readonly logger = new Logger(UserGraphql.name);
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async getAllPublishedQuest() {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query quests {
        quests(where: {quests_campaign: {status: {_eq: "Published"}}, status: {_eq: "Published"}}, order_by: {quests_campaign: {created_at: desc}, created_at: desc}) {
          id
          name
          condition
          requirement
          reward
          status
          type
          created_at
          updated_at
        }
      }
      `,
      'quests',
      {}
    );

    if (this.graphqlSvc.errorOrEmpty(result, 'quests')) {
      this.logger.error(JSON.stringify(result));
      return [];
    }

    return result.data.quests;
  }

  async queryUserWalletData(variables: any, token: string) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query authorizer_users($id: bpchar = "") {
        authorizer_users(where: {id: {_eq: $id}}) {
          id
          levels {
            level
            xp
          }
          authorizer_users_user_wallet {
            address
            data
            user_id
          }
        }
      }
      `,
      'authorizer_users',
      variables
    );

    if (this.graphqlSvc.errorOrEmpty(result, 'authorizer_users'))
      throw new NotFoundException();

    return result.data.authorizer_users[0];
  }

  async queryUserLevel(variables) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query authorizer_users($id: bpchar!) {
        authorizer_users(where: {id: {_eq: $id}}) {
          levels {
            xp
            level
          }
        }
      }`,
      'authorizer_users',
      variables
    );

    return result.data.authorizer_users[0];
  }

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

  userReadChapter(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation insert_user_read_chapter($chapter_id: Int!) {
        insert_user_read_chapter(objects: {chapter_id: $chapter_id}, on_conflict: {constraint: user_read_chapter_pkey, update_columns: updated_at}) {
          returning {
            user_id
            chapter_id
            updated_at
          }
        }
      }
      `,
      'insert_user_read_chapter',
      variables
    );
  }
}

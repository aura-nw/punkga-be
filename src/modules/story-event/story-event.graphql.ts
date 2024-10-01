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

  async insertStoryCharacter(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_story_character_one($object: story_character_insert_input = {}) {
        insert_story_character_one(object: $object) {
          id
        }
      }
      `,
      'insert_story_character_one',
      variables,
      headers
    );
  }

  async insertSubmission(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_story_event_submission($object: story_event_submission_insert_input = {}) {
        insert_story_event_submission_one(object: $object) {
          id
        }
      }`,
      'insert_story_event_submission',
      variables,
      headers
    );
  }
}

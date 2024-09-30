import { Injectable } from '@nestjs/common';
import { StoryEventGraphql } from './story-event.graphql';

@Injectable()
export class StoryEventService {
  constructor(private storyEventGraphql: StoryEventGraphql) {}

  async get(request_id: number) {
    try {
      const result = await this.storyEventGraphql.queryRequest({
        id: request_id,
      });

      if (result.data?.request_log_by_pk) {
        return result.data?.request_log_by_pk;
      } else {
        return result;
      }
    } catch (errors) {
      return {
        errors: {
          message: JSON.stringify(errors),
        },
      };
    }
  }
}

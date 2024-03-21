import { Injectable } from '@nestjs/common';
import { RequestGraphql } from './request.graphql';

@Injectable()
export class RequestService {
  constructor(
    private requestGraphql: RequestGraphql,
  ) { }

  async get(request_id: number) {
    try {
      const result = await this.requestGraphql.queryRequest({
        id: request_id,
      });

      if (result.data?.request_log_by_pk) {
        return result.data?.request_log_by_pk
      } else {
        return result;
      }

    } catch (errors) {
      return {
        errors: {
          message: JSON.stringify(errors)
        },
      };
    }
  }

}

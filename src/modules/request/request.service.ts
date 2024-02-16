import { Injectable } from '@nestjs/common';
import { RequestGraphql } from './request.graphql';

@Injectable()
export class RequestService {
  constructor(
    private requestGraphql: RequestGraphql,
  ) { }

  async get(request_id: number) {
    try {
      const request = await this.requestGraphql.queryRequest({
        id: request_id,
      });

      return request;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

}

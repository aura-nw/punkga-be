import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GraphqlService {
  async query(
    url: string,
    token: string,
    query: string,
    operationName: string,
    variables: any,
  ) {
    const headers = {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const response = await axios.post(
      url,
      {
        query,
        variables,
        operationName,
      },
      { headers },
    );
    return response.data;
  }
}

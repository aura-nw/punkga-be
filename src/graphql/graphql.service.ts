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
    additionHeaders?: any,
  ) {
    const defaultHeaders = {
      'content-type': 'application/json',
    };

    const authHeaders =
      token !== ''
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {};

    const headers = {
      ...defaultHeaders,
      ...authHeaders,
      ...additionHeaders,
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

  errorOrEmpty(result: any, fieldName: string) {
    if (result.errors && result.errors.length > 0) {
      return true;
    }

    if (result.data[fieldName].length === 0) {
      return true;
    }

    return false;
  }
}

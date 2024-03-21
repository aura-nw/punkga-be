import axios from 'axios';

export class GraphqlClient {
  async query(
    url: string,
    token: string,
    query: string,
    operationName: string,
    variables: any,
    additionHeaders?: any
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
      { headers }
    );
    return response.data;
  }

  isError(result: any) {
    if (result.errors && result.errors.length > 0) {
      return true;
    }
    return false;
  }


}
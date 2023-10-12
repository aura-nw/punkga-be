import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class KeysGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async queryEncryptedSystemKey() {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query system_key {
        system_key {
          encrypted_seed
        }
      }
      `,
      'system_key',
      {},
      headers
    );

    return result.data.system_key[0];
  }
}

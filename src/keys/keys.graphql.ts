import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class KeysGraphql {
  private readonly logger = new Logger(KeysGraphql.name);
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async queryEncryptedSeed() {
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

  async storeEncryptedSeed(encryptedSeed: string) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_system_key($encrypted_seed: String!) {
        insert_system_key(objects: {encrypted_seed: $encrypted_seed}) {
          affected_rows
        }
      }`,
      'insert_system_key',
      {
        encrypted_seed: encryptedSeed,
      },
      headers
    );

    this.logger.debug(result);
    if (result.data?.insert_system_key?.affected_rows > 0) {
      this.logger.debug(`Insert system key success`);
    } else {
      this.logger.debug(`Insert system key fail`);
    }
  }
}

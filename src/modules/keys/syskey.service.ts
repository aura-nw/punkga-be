import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KeysGraphql } from './keys.graphql';
import { KMSBuilderService } from './kms.service';
import { randomSeed } from './util';

@Injectable()
export class SysKeyService implements OnModuleInit {
  private readonly logger = new Logger(SysKeyService.name);
  private seed = '';

  constructor(
    private keysGraphql: KeysGraphql,
    private kmsService: KMSBuilderService
  ) { }

  async onModuleInit() {
    // get from db
    const result = await this.keysGraphql.queryEncryptedSeed();

    if (result) {
      const encryptedSeed = result.encrypted_seed;
      this.seed = await this.kmsService.getSeed(encryptedSeed);
    } else {
      this.seed = randomSeed();
      // encrypt seed & store db
      const encryptedSeed = await this.kmsService.encryptSeed(this.seed);
      await this.keysGraphql.storeEncryptedSeed(encryptedSeed);
    }
  }

  get originalSeed() {
    return this.seed;
  }
}

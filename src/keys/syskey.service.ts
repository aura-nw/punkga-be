import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KeysGraphql } from './keys.graphql';

@Injectable()
export class SysKeyService {
  private readonly logger = new Logger(SysKeyService.name);
  private seed = '';

  constructor(
    private configService: ConfigService,
    private keysGraphql: KeysGraphql,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache
  ) {}

  async instantiate() {
    // get seed from cache
    let seed = await this.cacheManager.get<string>('original-seed');

    if (seed === null) {
      // get from db
      const encryptedSeed = this.keysGraphql.queryEncryptedSystemKey();
    }
  }
}

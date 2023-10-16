import { Module } from '@nestjs/common';
import { SysKeyService } from './syskey.service';
import { KMSBuilderService } from './kms.service';
import { KeysGraphql } from './keys.graphql';
import { GraphqlModule } from '../graphql/graphql.module';

@Module({
  imports: [GraphqlModule],
  providers: [SysKeyService, KMSBuilderService, KeysGraphql],
  exports: [SysKeyService],
})
export class SysKeyModule {}

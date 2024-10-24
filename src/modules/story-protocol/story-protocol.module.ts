import { Module } from '@nestjs/common';

import { GraphqlModule } from '../graphql/graphql.module';
import { StoryProtocolGraphql } from './story-protocol.graphql';
import { StoryProtocolController } from './story-protocol.controller';
import { StoryProtocolService } from './story-protocol.service';
import { BullModule } from '@nestjs/bull';
import { FilesModule } from '../files/files.module';
import { UserWalletModule } from '../user-wallet/user-wallet.module';
import { JwtModule } from '@nestjs/jwt';
import { StoryProtocolTask } from './story-protocol.task';
import { SystemCustodialWalletModule } from '../../modules/system-custodial-wallet/system-custodial-wallet.module';

@Module({
  imports: [
    GraphqlModule,
    BullModule.registerQueue({
      name: 'story-protocol',
    }),
    FilesModule,
    UserWalletModule,
    JwtModule,
    SystemCustodialWalletModule,
  ],
  providers: [StoryProtocolService, StoryProtocolGraphql, StoryProtocolTask],
  controllers: [StoryProtocolController],
  exports: [],
})
export class StoryProtocolModule {}

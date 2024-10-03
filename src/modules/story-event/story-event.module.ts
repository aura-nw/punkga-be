import { Module } from '@nestjs/common';

import { GraphqlModule } from '../graphql/graphql.module';
import { StoryEventGraphql } from './story-event.graphql';
import { StoryEventController } from './story-event.controller';
import { StoryEventService } from './story-event.service';
import { BullModule } from '@nestjs/bull';
import { FilesModule } from '../files/files.module';
import { UserWalletModule } from '../user-wallet/user-wallet.module';
import { JwtModule } from '@nestjs/jwt';
import { StoryEventConsumer } from './story-event.consumer';

@Module({
  imports: [
    GraphqlModule,
    BullModule.registerQueue({
      name: 'story-event',
    }),
    FilesModule,
    UserWalletModule,
    JwtModule,
  ],
  providers: [StoryEventService, StoryEventGraphql, StoryEventConsumer],
  controllers: [StoryEventController],
  exports: [],
})
export class StoryEventModule {}

import { Module } from '@nestjs/common';

import { GraphqlModule } from '../graphql/graphql.module';
import { StoryEventGraphql } from './story-event.graphql';
import { StoryEventController } from './story-event.controller';
import { StoryEventService } from './story-event.service';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    GraphqlModule,
    BullModule.registerQueue({
      name: 'story-event',
    }),
  ],
  providers: [StoryEventService, StoryEventGraphql],
  controllers: [StoryEventController],
  exports: [],
})
export class StoryEventModule {}

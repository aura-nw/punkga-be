import { Module } from '@nestjs/common';

import { GraphqlModule } from '../graphql/graphql.module';
import { StoryEventGraphql } from './story-event.graphql';
import { StoryEventController } from './story-event.controller';
import { StoryEventService } from './story-event.service';

@Module({
  imports: [GraphqlModule],
  providers: [StoryEventService, StoryEventGraphql],
  controllers: [StoryEventController],
  exports: [],
})
export class StoryEventModule {}

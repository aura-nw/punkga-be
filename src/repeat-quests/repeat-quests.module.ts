import { Module } from '@nestjs/common';

import { GraphqlModule } from '../graphql/graphql.module';
import { RepeatQuestsGraphql } from './repeat-quests.graphql';
import { RepeatQuestTaskService } from './repeat-quests.task';
import { RepeatQuestController } from './repeat-quests.controller';
import { RepeatQuestService } from './repeat-quests.service';

@Module({
  imports: [GraphqlModule],
  providers: [RepeatQuestsGraphql, RepeatQuestTaskService, RepeatQuestService],
  controllers: [RepeatQuestController],
  exports: [RepeatQuestsGraphql],
})
export class RepeatQuestModule {}

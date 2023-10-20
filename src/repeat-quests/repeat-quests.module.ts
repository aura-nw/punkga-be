import { Module } from '@nestjs/common';

import { GraphqlModule } from '../graphql/graphql.module';
import { RepeatQuestsGraphql } from './repeat-quests.graphql';
import { RepeatQuestTaskService } from './repeat-quests.task';

@Module({
  imports: [GraphqlModule],
  providers: [RepeatQuestsGraphql, RepeatQuestTaskService],
  exports: [RepeatQuestsGraphql],
})
export class RepeatQuestModule {}

import { Module } from '@nestjs/common';

import { GraphqlModule } from '../graphql/graphql.module';
import { RepeatQuestsGraphql } from './repeat-quests.graphql';

@Module({
  imports: [GraphqlModule],
  providers: [RepeatQuestsGraphql],
  exports: [RepeatQuestsGraphql],
})
export class RepeatQuestModule {}

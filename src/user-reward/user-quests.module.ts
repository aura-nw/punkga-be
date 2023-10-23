import { Module } from '@nestjs/common';

import { GraphqlModule } from '../graphql/graphql.module';
import { UserQuestsGraphql } from './user-quests.graphql';

@Module({
  imports: [GraphqlModule],
  providers: [UserQuestsGraphql],
  exports: [UserQuestsGraphql],
})
export class UserQuestModule {}

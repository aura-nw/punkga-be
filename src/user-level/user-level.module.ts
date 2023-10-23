import { Module } from '@nestjs/common';

import { GraphqlModule } from '../graphql/graphql.module';
import { UserLevelGraphql } from './user-level.graphql';

@Module({
  imports: [GraphqlModule],
  providers: [UserLevelGraphql],
  exports: [UserLevelGraphql],
})
export class UserLevelModule {}

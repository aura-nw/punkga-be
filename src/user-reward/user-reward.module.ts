import { Module } from '@nestjs/common';

import { GraphqlModule } from '../graphql/graphql.module';
import { UserRewardGraphql } from './user-reward.graphql';

@Module({
  imports: [GraphqlModule],
  providers: [UserRewardGraphql],
  exports: [UserRewardGraphql],
})
export class UserRewardModule {}

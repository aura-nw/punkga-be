import { Module } from '@nestjs/common';

import { GraphqlModule } from '../graphql/graphql.module';
import { SubscribersGraphql } from './subscribers.graphql';

@Module({
  imports: [GraphqlModule],
  providers: [SubscribersGraphql],
  exports: [SubscribersGraphql],
})
export class SubscribersModule {}

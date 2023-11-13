import { Module } from '@nestjs/common';

import { GraphqlModule } from '../graphql/graphql.module';
import { SocialActivitiesGraphql } from './social-activities.graphql';

@Module({
  imports: [GraphqlModule],
  providers: [SocialActivitiesGraphql],
  exports: [SocialActivitiesGraphql],
})
export class SocialActivitiesModule {}

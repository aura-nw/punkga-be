import { Module } from '@nestjs/common';

import { GraphqlModule } from '../graphql/graphql.module';
import { LevelingService } from './leveling.service';

@Module({
  imports: [GraphqlModule],
  providers: [LevelingService],
  exports: [LevelingService],
})
export class LevelingModule {}

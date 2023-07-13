import { Module } from '@nestjs/common';
import { TasksService } from './task.service';
import { RedisModule } from '../redis/redis.module';
import { GraphqlModule } from '../graphql/graphql.module';

@Module({
  imports: [RedisModule, GraphqlModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}

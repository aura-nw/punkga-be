import { Module } from '@nestjs/common';
import { TasksService } from './task.service';
import { GraphqlModule } from '../graphql/graphql.module';
import { TaskGraphql } from './task.graphql';

@Module({
  imports: [GraphqlModule],
  providers: [TasksService, TaskGraphql],
  exports: [TasksService],
})
export class TasksModule {}

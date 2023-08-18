import { Module } from '@nestjs/common';
import { TasksService } from './task.service';
import { GraphqlModule } from '../graphql/graphql.module';

@Module({
  imports: [GraphqlModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}

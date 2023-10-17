import { Module } from '@nestjs/common';
import { QuestService } from './quest.service';
import { FilesModule } from '../files/files.module';
import { QuestController } from './quest.controller';
import { JwtModule } from '@nestjs/jwt';
import { QuestGraphql } from './quest.graphql';
import { GraphqlModule } from '../graphql/graphql.module';

@Module({
  imports: [FilesModule, JwtModule, GraphqlModule],
  providers: [QuestService, QuestGraphql],
  controllers: [QuestController],
  exports: [],
})
export class QuestModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChapterService } from './chapter.service';
import { ChapterController } from './chapter.controller';
import { GraphqlModule } from '../graphql/graphql.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [JwtModule, GraphqlModule, FilesModule],
  providers: [ChapterService],
  controllers: [ChapterController],
})
export class ChapterModule {}

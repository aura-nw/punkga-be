import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { FilesModule } from '../files/files.module';
import { GraphqlModule } from '../graphql/graphql.module';
import { MangaModule } from '../manga/manga.module';
import { ChapterController } from './chapter.controller';
import { ChapterGraphql } from './chapter.graphql';
import { ChapterService } from './chapter.service';
import { UploadChapterService } from './upload-chapter.service';
import { CreatorModule } from '../creator/creator.module';

@Module({
  imports: [JwtModule, GraphqlModule, FilesModule, MangaModule, CreatorModule],
  providers: [ChapterService, UploadChapterService, ChapterGraphql],
  controllers: [ChapterController],
  exports: [UploadChapterService, ChapterGraphql, ChapterService],
})
export class ChapterModule {}

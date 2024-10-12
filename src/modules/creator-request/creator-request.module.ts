import { Module } from '@nestjs/common';

import { GraphqlModule } from '../graphql/graphql.module';
import { CreatorRequestGraphql } from './creator-request.graphql';
import { RequestController } from './creator-request.controller';
import { CreatorRequestService } from './creator-request.service';
import { MangaModule } from '../../modules/manga/manga.module';
import { JwtModule } from '@nestjs/jwt';
import { FilesModule } from '../files/files.module';
import { MangaGraphql } from '../../modules/manga/manga.graphql';
import { ChapterModule } from '../../modules/chapter/chapter.module';
import { ChapterGraphql } from '../../modules/chapter/chapter.graphql';
@Module({
  imports: [JwtModule, FilesModule, GraphqlModule, MangaModule, ChapterModule],
  providers: [
    CreatorRequestService,
    CreatorRequestGraphql,
    MangaGraphql,
    ChapterGraphql,
  ],
  controllers: [RequestController],
  exports: [],
})
export class CreatorRequestModule {}

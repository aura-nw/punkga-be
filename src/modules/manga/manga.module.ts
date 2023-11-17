import { Module } from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { JwtModule } from '@nestjs/jwt';
import { FilesModule } from '../files/files.module';
import { GraphqlModule } from '../graphql/graphql.module';
import { MangaGraphql } from './manga.graphql';

@Module({
  imports: [JwtModule, FilesModule, GraphqlModule],
  providers: [MangaService, MangaGraphql],
  controllers: [MangaController],
  exports: [MangaService],
})
export class MangaModule {}

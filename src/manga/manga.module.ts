import { Module } from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { JwtModule } from '@nestjs/jwt';
import { FilesModule } from '../files/files.module';
import { GraphqlModule } from '../graphql/graphql.module';

@Module({
  imports: [JwtModule, FilesModule, GraphqlModule],
  providers: [MangaService],
  controllers: [MangaController],
})
export class MangaModule {}

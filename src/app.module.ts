import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChapterModule } from './chapter/chapter.module';
import { MangaModule } from './manga/manga.module';
import configuration from './config/configuration';
import { JwtModule } from '@nestjs/jwt';
import { FilesModule } from './files/files.module';
import { GraphqlModule } from './graphql/graphql.module';

@Module({
  imports: [
    JwtModule,
    ChapterModule,
    MangaModule,
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    FilesModule,
    GraphqlModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

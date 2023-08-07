import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChapterModule } from './chapter/chapter.module';
import { MangaModule } from './manga/manga.module';
import configuration from './config/configuration';
import { JwtModule } from '@nestjs/jwt';
import { FilesModule } from './files/files.module';
import { GraphqlModule } from './graphql/graphql.module';
import { UserModule } from './user/user.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksModule } from './task/task.module';

@Module({
  imports: [
    JwtModule,
    ScheduleModule.forRoot(),
    ChapterModule,
    MangaModule,
    TasksModule,
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    FilesModule,
    GraphqlModule,
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

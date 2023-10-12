import { CacheModule } from '@nestjs/cache-manager';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';

import { ChapterModule } from './chapter/chapter.module';
import configuration from './config/configuration';
import { CreatorModule } from './creator/creator.module';
import { FilesModule } from './files/files.module';
import { GraphqlModule } from './graphql/graphql.module';
import { MangaModule } from './manga/manga.module';
import { TasksModule } from './task/task.module';
import { UserModule } from './user/user.module';
import { QuestModule } from './quest/quest.module';

@Module({
  imports: [
    JwtModule,
    ScheduleModule.forRoot(),
    CacheModule.register(),
    ChapterModule,
    MangaModule,
    CreatorModule,
    TasksModule,
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    FilesModule,
    GraphqlModule,
    UserModule,
    QuestModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
  ],
})
export class AppModule {}

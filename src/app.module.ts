import { CacheModule } from '@nestjs/cache-manager';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';

import { ChapterModule } from './modules/chapter/chapter.module';
import configuration from './config/configuration';
import { CreatorModule } from './modules/creator/creator.module';
import { FilesModule } from './modules/files/files.module';
import { GraphqlModule } from './modules/graphql/graphql.module';
import { MangaModule } from './modules/manga/manga.module';
import { TasksModule } from './modules/task/task.module';
import { UserModule } from './modules/user/user.module';
import { QuestModule } from './modules/quest/quest.module';
import { SysKeyModule } from './modules/keys/syskey.module';
import { UserWalletModule } from './modules/user-wallet/user-wallet.module';
import { CampaignModule } from './modules/campaign/campaign.module';

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
    SysKeyModule,
    UserWalletModule,
    CampaignModule,
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

import { CacheModule } from '@nestjs/cache-manager';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { ChapterModule } from './modules/chapter/chapter.module';
import { CreatorModule } from './modules/creator/creator.module';
import { FilesModule } from './modules/files/files.module';
import { GraphqlModule } from './modules/graphql/graphql.module';
import { SysKeyModule } from './modules/keys/syskey.module';
import { MangaModule } from './modules/manga/manga.module';
import { QuestModule } from './modules/quest/quest.module';
import { TasksModule } from './modules/task/task.module';
import { UserWalletModule } from './modules/user-wallet/user-wallet.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
    }),
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
    AuthModule
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
export class AppModule { }

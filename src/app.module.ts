import { BullModule } from '@nestjs/bull';
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';

import configuration from './config/configuration';
import { CampaignModule } from './modules/campaign/campaign.module';
import { ChapterModule } from './modules/chapter/chapter.module';
import { CreatorModule } from './modules/creator/creator.module';
import { FilesModule } from './modules/files/files.module';
import { GraphqlModule } from './modules/graphql/graphql.module';
import { SysKeyModule } from './modules/keys/syskey.module';
import { MangaModule } from './modules/manga/manga.module';
import { QuestModule } from './modules/quest/quest.module';
import { RedisModule } from './modules/redis/redis.module';
import { RequestModule } from './modules/request/request.module';
import { SystemCustodialWalletModule } from './modules/system-custodial-wallet/system-custodial-wallet.module';
import { TasksModule } from './modules/task/task.module';
import { UserWalletModule } from './modules/user-wallet/user-wallet.module';
import { UserModule } from './modules/user/user.module';
import { LaunchpadModule } from './modules/collection/launchpad.module';
import { ChainModule } from './modules/chain/chain.module';
import { ChainGateWayModule } from './chain-gateway/chain-gateway.module';
import { ArtworkModule } from './modules/artwork/artwork.module';
import { AlbumModule } from './modules/album/album.module';
import { TelegramModule } from './modules/telegram/telegram.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          db: configService.get('redis.db'),
        },
        prefix: 'punkga',
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: 10,
        },
      }),
      inject: [ConfigService],
    }),
    JwtModule,
    ScheduleModule.forRoot(),
    CacheModule.register({
      isGlobal: true,
      ttl: 5,
      max: 20,
    }),
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
    RequestModule,
    RedisModule,
    SystemCustodialWalletModule,
    LaunchpadModule,
    ChainModule,
    ChainGateWayModule,
    ArtworkModule,
    AlbumModule,
    TelegramModule,
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
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}

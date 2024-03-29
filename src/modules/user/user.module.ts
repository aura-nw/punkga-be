import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { GraphqlModule } from '../graphql/graphql.module';
import { FilesModule } from '../files/files.module';
import { UserGraphql } from './user.graphql';
import { MangaModule } from '../manga/manga.module';
import { QuestModule } from '../quest/quest.module';
import { BullModule } from '@nestjs/bull';
import { RedisModule } from '../redis/redis.module';
import { UserWalletProcessor } from './user.process';
import { UserWalletModule } from '../user-wallet/user-wallet.module';
import { SystemCustodialWalletModule } from '../system-custodial-wallet/system-custodial-wallet.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'userWallet',
    }),
    JwtModule,
    GraphqlModule,
    FilesModule,
    MangaModule,
    QuestModule,
    RedisModule,
    UserWalletModule,
    SystemCustodialWalletModule
  ],
  providers: [UserService, UserGraphql, UserWalletProcessor],
  controllers: [UserController],
  exports: [UserGraphql],
})
export class UserModule { }

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { FilesModule } from '../files/files.module';
import { GraphqlModule } from '../graphql/graphql.module';
import { SysKeyModule } from '../keys/syskey.module';
import { UserWalletController } from './user-wallet.controller';
import { UserWalletGraphql } from './user-wallet.graphql';
import { UserWalletService } from './user-wallet.service';
import { MasterWalletService } from './master-wallet.service';
import { UserWalletProcessor } from './user-wallet.process';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [JwtModule, GraphqlModule, FilesModule, SysKeyModule, RedisModule],
  providers: [UserWalletService, UserWalletGraphql, MasterWalletService, UserWalletProcessor],
  controllers: [UserWalletController],
  exports: [MasterWalletService],
})
export class UserWalletModule { }

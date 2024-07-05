import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { GraphqlModule } from '../graphql/graphql.module';
import { UserWalletModule } from '../user-wallet/user-wallet.module';
import { ChainService } from './chain.service';
import { ChainGraphql } from './chain.graphql';
import { ChainController } from './chain.controller';

@Module({
  imports: [JwtModule, GraphqlModule, UserWalletModule],
  providers: [ChainService, ChainGraphql],
  controllers: [ChainController],
})
export class ChainModule {}

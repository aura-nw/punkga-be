import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { KlaytnClientService } from './klaytn.service';
import { GraphqlModule } from '../modules/graphql/graphql.module';
import { UserWalletModule } from '../modules/user-wallet/user-wallet.module';
import { SystemCustodialWalletModule } from '../modules/system-custodial-wallet/system-custodial-wallet.module';
import { ChainGatewayService } from './chain-gateway.service';
import { AuraClientService } from './aura.service';

@Module({
  imports: [
    JwtModule,
    GraphqlModule,
    UserWalletModule,
    SystemCustodialWalletModule,
  ],
  providers: [ChainGatewayService, KlaytnClientService, AuraClientService],
  controllers: [],
  exports: [ChainGatewayService],
})
export class ChainGateWayModule {}

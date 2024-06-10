import { Module } from '@nestjs/common';
import { GraphqlModule } from '../graphql/graphql.module';
import { SystemCustodialWalletService } from './system-custodial-wallet.service';
import { SystemCustodialWalletGraphql } from './system-custodial-wallet.graphql';
import { SysKeyModule } from '../keys/syskey.module';
import { UserWalletModule } from '../user-wallet/user-wallet.module';

@Module({
  imports: [GraphqlModule, SysKeyModule, UserWalletModule],
  providers: [SystemCustodialWalletService, SystemCustodialWalletGraphql],
  exports: [SystemCustodialWalletService],
})
export class SystemCustodialWalletModule {}

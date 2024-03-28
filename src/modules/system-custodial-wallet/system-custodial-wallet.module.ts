import { Module } from '@nestjs/common';
import { GraphqlModule } from '../graphql/graphql.module';
import { SystemCustodialWalletService } from './system-custodial-wallet.service';
import { SystemCustodialWalletGraphql } from './system-custodial-wallet.graphql';
import { UserWalletModule } from '../user-wallet/user-wallet.module';
import { SysKeyModule } from '../keys/syskey.module';

@Module({
  imports: [GraphqlModule, UserWalletModule, SysKeyModule],
  providers: [SystemCustodialWalletService, SystemCustodialWalletGraphql],
  exports: [],
})
export class SystemCustodialWalletModule { }

import { Module } from '@nestjs/common';
import { GraphqlModule } from '../graphql/graphql.module';
import { SystemCustodialWalletService } from './system-custodial-wallet.service';
import { SystemCustodialWalletGraphql } from './system-custodial-wallet.graphql';
import { SysKeyModule } from '../keys/syskey.module';

@Module({
  imports: [GraphqlModule, SysKeyModule],
  providers: [SystemCustodialWalletService, SystemCustodialWalletGraphql],
  exports: [SystemCustodialWalletService],
})
export class SystemCustodialWalletModule { }

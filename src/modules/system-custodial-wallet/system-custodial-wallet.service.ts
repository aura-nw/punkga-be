import { BasicAllowance } from 'cosmjs-types/cosmos/feegrant/v1beta1/feegrant';
import { MsgGrantAllowance } from 'cosmjs-types/cosmos/feegrant/v1beta1/tx';

import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { calculateFee, GasPrice, StdFee } from '@cosmjs/stargate';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SysKeyService } from '../keys/syskey.service';
import { MasterWalletService } from '../user-wallet/master-wallet.service';
import { SystemCustodialWalletGraphql } from './system-custodial-wallet.graphql';
import { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin';

@Injectable()
export class SystemCustodialWalletService implements OnModuleInit {
  private readonly logger = new Logger(SystemCustodialWalletService.name);
  private granterWallet = null;
  private granterWalletAddress: string;
  private executeFee: StdFee;
  private client: SigningCosmWasmClient;

  constructor(
    private configService: ConfigService,
    private walletGraphql: SystemCustodialWalletGraphql,
    private masterWalletService: MasterWalletService,
    private sysKeyService: SysKeyService,
  ) { }

  async onModuleInit() {
    await this.initGranterWallet();
  }

  async broadcastTx(messages: any) {
    const result = await this.client.signAndBroadcast(
      this.granterWalletAddress,
      messages,
      'auto',
      'punkga'
    )

    // this.logger.debug(result);
    return result;
  }

  async initGranterWallet() {
    // get from db
    const granterWalletData = await this.walletGraphql.getGranterWallet();
    if (granterWalletData) {
      const { wallet, account } = await this.masterWalletService.deserializeWallet(granterWalletData.data);

      this.granterWallet = wallet;
      this.granterWalletAddress = account[0].address;
    } else {
      const { wallet, account, serializedWallet } =
        await this.sysKeyService.randomWallet();

      this.granterWallet = wallet;
      this.granterWalletAddress = account[0].address;

      // store db
      const result = await this.walletGraphql.insertGranterWallet({
        objects: [
          {
            address: account[0].address,
            data: JSON.parse(serializedWallet).data,
            type: "GRANTER",
          },
        ],
      });
      this.logger.debug(`Insert granter wallet: ${JSON.stringify(result)}`);
    }

    const gasPrice = GasPrice.fromString(
      this.configService.get<string>('network.gasPrice')
    );
    this.executeFee = calculateFee(300_000, gasPrice);

    // build client
    const rpcEndpoint = this.configService.get<string>('network.rpcEndpoint');
    this.client = await SigningCosmWasmClient.connectWithSigner(
      rpcEndpoint,
      this.granterWallet,
      {
        gasPrice,
      }
    );
  }

  // async grantFee(granteeAddress: string) {
  //   const msgs = this.generateGrantFeeMsg(granteeAddress)
  // }

  generateGrantFeeMsg(granteeAddress: string) {

    const denom = this.configService.get<string>('network.denom');
    const grantAmount = this.configService.get<string>('network.grantAmount');
    const spendLimit: Coin[] = [{ denom, amount: grantAmount }];
    const allowance = {
      typeUrl: '/cosmos.feegrant.v1beta1.BasicAllowance',
      value: Uint8Array.from(
        BasicAllowance.encode({
          spendLimit,
        }).finish(),
      ),
    };
    const message = {
      typeUrl: '/cosmos.feegrant.v1beta1.MsgGrantAllowance',
      value: MsgGrantAllowance.fromPartial({
        granter: this.granterWalletAddress,
        grantee: granteeAddress,
        allowance,
      })
    };

    return [message];

  }
}
import * as bip39 from 'bip39';

import { BasicAllowance } from 'cosmjs-types/cosmos/feegrant/v1beta1/feegrant';
import { MsgGrantAllowance } from 'cosmjs-types/cosmos/feegrant/v1beta1/tx';

import { GasPrice, SigningStargateClient, SigningStargateClientOptions } from '@cosmjs/stargate';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SysKeyService } from '../keys/syskey.service';
import { SystemCustodialWalletGraphql } from './system-custodial-wallet.graphql';
import { Any } from 'cosmjs-types/google/protobuf/any';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';

@Injectable()
export class SystemCustodialWalletService implements OnModuleInit {
  private readonly logger = new Logger(SystemCustodialWalletService.name);
  private granterWallet: DirectSecp256k1HdWallet = null;
  private granterWalletAddress: string;
  private client: SigningStargateClient;

  constructor(
    private configService: ConfigService,
    private walletGraphql: SystemCustodialWalletGraphql,
    private sysKeyService: SysKeyService,
  ) { }

  async onModuleInit() {
    await this.initGranterWallet();
  }

  async grantFee(granteeWalletAddress: string) {
    const grantMsg = this.generateGrantFeeMsg(granteeWalletAddress);
    return this.broadcastTx([grantMsg], 'fee-grant-migrate-wallet');
  }

  async broadcastTx(messages: any, memo = 'punkga') {
    const result = await this.client.signAndBroadcast(
      this.granterWalletAddress,
      messages,
      1.5,
      memo
    )

    // this.logger.debug(result);
    return result;
  }

  async initGranterWallet() {
    // get from db
    const granterWalletData = await this.walletGraphql.getGranterWallet();
    if (granterWalletData) {
      const wallet = await DirectSecp256k1HdWallet.deserialize(
        granterWalletData.data,
        this.sysKeyService.originalSeed
      );
      const account = await wallet.getAccounts();

      this.granterWallet = wallet;
      this.granterWalletAddress = account[0].address;
    } else {

      const mnemonic = bip39.generateMnemonic();
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: 'aura',
      });

      const account = await wallet.getAccounts();
      const serializedWallet = await wallet.serialize(
        this.sysKeyService.originalSeed
      );

      this.granterWallet = wallet;
      this.granterWalletAddress = account[0].address;

      // store db
      const result = await this.walletGraphql.insertGranterWallet({
        objects: [
          {
            address: account[0].address,
            data: serializedWallet,
            type: "GRANTER",
          },
        ],
      });
      this.logger.debug(`Insert granter wallet: ${JSON.stringify(result)}`);
    }

    // const defaultSigningClientOptions: SigningStargateClientOptions = {
    //   broadcastPollIntervalMs: 300,
    //   broadcastTimeoutMs: 8_000,
    //   gasPrice: GasPrice.fromString(this.configService.get<string>('network.gasPrice')),
    // };

    // build client
    // const rpcEndpoint = this.configService.get<string>('network.rpcEndpoint');
    // this.client = await SigningStargateClient.connectWithSigner(
    //   rpcEndpoint,
    //   this.granterWallet,
    //   defaultSigningClientOptions
    // );
  }

  get granterAddress() {
    return this.granterWalletAddress;
  }

  generateGrantFeeMsg(granteeAddress: string) {
    const denom = this.configService.get<string>('network.denom');
    const grantAmount = this.configService.get<string>('network.grantAmount');
    const allowance: Any = {
      typeUrl: '/cosmos.feegrant.v1beta1.BasicAllowance',
      value: Uint8Array.from(
        BasicAllowance.encode(
          BasicAllowance.fromPartial({
            spendLimit: [
              {
                denom: denom || "uaura",
                amount: String(grantAmount) || '100000',
              },
            ],
          })
        ).finish(),
      ),
    };
    const grantMsg = {
      typeUrl: "/cosmos.feegrant.v1beta1.MsgGrantAllowance",
      value: MsgGrantAllowance.fromPartial({
        granter: this.granterWalletAddress,
        grantee: granteeAddress,
        allowance: allowance,
      }),
    };

    return grantMsg;

  }
}

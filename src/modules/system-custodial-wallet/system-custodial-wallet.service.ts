// import * as bip39 from 'bip39';

// import { BasicAllowance } from 'cosmjs-types/cosmos/feegrant/v1beta1/feegrant';
// import { MsgGrantAllowance } from 'cosmjs-types/cosmos/feegrant/v1beta1/tx';

// import {
//   GasPrice,
//   SigningStargateClient,
//   SigningStargateClientOptions,
// } from '@cosmjs/stargate';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SysKeyService } from '../keys/syskey.service';
import { SystemCustodialWalletGraphql } from './system-custodial-wallet.graphql';
import { HDNodeWallet, JsonRpcProvider, Wallet, parseEther } from 'ethers';
import { MasterWalletService } from '../user-wallet/master-wallet.service';
// import { Any } from 'cosmjs-types/google/protobuf/any';
// import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';

@Injectable()
export class SystemCustodialWalletService implements OnModuleInit {
  private readonly logger = new Logger(SystemCustodialWalletService.name);
  private granterWallet: HDNodeWallet = null;
  private granterWalletAddress: string;
  // private client: SigningStargateClient;
  private provider: JsonRpcProvider = null;

  constructor(
    private configService: ConfigService,
    private walletGraphql: SystemCustodialWalletGraphql,
    private sysKeyService: SysKeyService,
    private masterWalletService: MasterWalletService
  ) {}

  async onModuleInit() {
    await this.initGranterWallet();
  }

  async initGranterWallet() {
    // get from db
    const granterWalletData = await this.walletGraphql.getGranterWallet();
    const providerUrl = this.configService.get<string>('network.rpcEndpoint');
    this.provider = new JsonRpcProvider(providerUrl);

    if (granterWalletData) {
      const phrase = this.masterWalletService.decryptPhrase(
        granterWalletData.data
      );
      const wallet = Wallet.fromPhrase(phrase, this.provider);

      this.granterWallet = wallet;
      this.granterWalletAddress = wallet.address;
    } else {
      const { wallet, address, cipherPhrase } =
        await this.sysKeyService.randomWallet(this.provider);

      this.granterWallet = wallet;
      this.granterWalletAddress = address;

      // store db
      const result = await this.walletGraphql.insertGranterWallet({
        objects: [
          {
            address,
            data: cipherPhrase,
            type: 'GRANTER',
          },
        ],
      });
      this.logger.debug(`Insert granter wallet: ${JSON.stringify(result)}`);
    }
  }

  async faucet(address: string) {
    const nonce = await this.granterWallet.getNonce();
    const tx = await this.granterWallet.sendTransaction({
      nonce,
      to: address,
      value: parseEther('0.1'),
    });

    return tx.wait();
  }

  get granterAddress() {
    return this.granterWalletAddress;
  }
}

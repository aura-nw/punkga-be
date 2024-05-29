// import { StdFee } from '@cosmjs/amino';
// import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
// import { toUtf8 } from '@cosmjs/encoding';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SysKeyService } from '../keys/syskey.service';
import { UserWalletGraphql } from './user-wallet.graphql';
import { Crypter } from '../../utils/crypto';
import { JsonRpcProvider, Wallet } from 'ethers';

@Injectable()
export class MasterWalletService implements OnModuleInit {
  private readonly logger = new Logger(MasterWalletService.name);
  private masterWallet = null;
  private masterWalletAddress = '';
  private contractAddress: string;
  // private executeFee: StdFee;
  // private client: SigningCosmWasmClient;

  constructor(
    private configService: ConfigService,
    private userWalletGraphql: UserWalletGraphql,
    private sysKeyService: SysKeyService
  ) {}

  // init master wallet
  async onModuleInit() {
    await this.initMasterWallet();
  }

  async initMasterWallet() {
    const masterWalletPK = this.configService.get<string>('masterPK');
    const providerUrl = this.configService.get<string>('network.rpcEndpoint');
    const provider = new JsonRpcProvider(providerUrl);
    this.masterWallet = new Wallet(masterWalletPK, provider);
    this.masterWalletAddress = this.masterWallet.address;
    // console.log('this.masterWallet', this.masterWallet);
    // console.log('this.masterWalletAddress', this.masterWalletAddress);
  }

  async getMasterWallet() {
    if (this.masterWallet && this.masterWalletAddress) {
      return {
        wallet: this.masterWallet,
        address: this.masterWalletAddress,
      };
    } else {
      return null;
    }
  }

  decryptPhrase(data: any) {
    return Crypter.decrypt(data, this.sysKeyService.originalSeed);
  }

  async broadcastTx(messages: any) {
    const result = await this.client.signAndBroadcast(
      this.masterWalletAddress,
      messages,
      'auto',
      'punkga'
    );

    // this.logger.debug(result);
    return result;
  }
}

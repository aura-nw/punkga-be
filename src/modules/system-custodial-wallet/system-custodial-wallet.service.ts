import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SysKeyService } from '../keys/syskey.service';
import { SystemCustodialWalletGraphql } from './system-custodial-wallet.graphql';
import { HDNodeWallet, JsonRpcProvider, Wallet, parseEther } from 'ethers';
import { MasterWalletService } from '../user-wallet/master-wallet.service';
import { HDAccount, mnemonicToAccount } from 'viem/accounts';

@Injectable()
export class SystemCustodialWalletService implements OnModuleInit {
  private readonly logger = new Logger(SystemCustodialWalletService.name);
  private granterWallet: HDNodeWallet = null;
  private granterWalletAddress: string;
  private sspWallet: HDNodeWallet = null;
  private sspWalletAddress: string;
  private sspAccount: HDAccount;

  constructor(
    private configService: ConfigService,
    private walletGraphql: SystemCustodialWalletGraphql,
    private sysKeyService: SysKeyService,
    private masterWalletService: MasterWalletService
  ) {}

  async onModuleInit() {
    await this.initGranterWallet();
    await this.initSystemStoryProtocolWallet();
  }

  async initGranterWallet() {
    // get from db
    const granterWalletData = await this.walletGraphql.getGranterWallet();

    if (granterWalletData) {
      const phrase = this.masterWalletService.decryptPhrase(
        granterWalletData.data
      );
      const wallet = Wallet.fromPhrase(phrase);

      this.granterWallet = wallet;
      this.granterWalletAddress = wallet.address;
    } else {
      const { wallet, address, cipherPhrase } =
        await this.sysKeyService.randomWallet();

      this.granterWallet = wallet;
      this.granterWalletAddress = address;

      // store db
      const result = await this.walletGraphql.insertSystemCustodialWallet({
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

  async initSystemStoryProtocolWallet() {
    // get from db
    const sspWalletData = await this.walletGraphql.getSSPWallet();

    if (sspWalletData) {
      const phrase = this.masterWalletService.decryptPhrase(sspWalletData.data);
      const wallet = Wallet.fromPhrase(phrase);
      this.sspAccount = mnemonicToAccount(phrase);

      this.sspWallet = wallet;
      this.sspWalletAddress = wallet.address;
    } else {
      const { wallet, address, cipherPhrase, account } =
        await this.sysKeyService.randomWallet();

      this.sspWallet = wallet;
      this.sspWalletAddress = address;
      this.sspAccount = account;

      // store db
      const result = await this.walletGraphql.insertSystemCustodialWallet({
        objects: [
          {
            address,
            data: cipherPhrase,
            type: 'SSP',
          },
        ],
      });
      this.logger.debug(`Insert ssp wallet: ${JSON.stringify(result)}`);
    }
  }

  async faucet(address: string, provider: JsonRpcProvider) {
    const wallet = this.granterWallet.connect(provider);
    const nonce = await wallet.getNonce();
    const tx = await wallet.sendTransaction({
      nonce,
      to: address,
      value: parseEther('0.1'),
    });

    return tx.wait();
  }

  get granterAddress() {
    return this.granterWalletAddress;
  }

  getSSPAccount(): HDAccount {
    return this.sspAccount;
  }
}

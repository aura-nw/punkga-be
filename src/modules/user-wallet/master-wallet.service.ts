import {
  BaseContract,
  Contract,
  HDNodeWallet,
  JsonRpcProvider,
  Wallet,
} from 'ethers';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Crypter } from '../../utils/crypto';
import { SysKeyService } from '../keys/syskey.service';
import { abi as levelingAbi } from './../../abi/PunkgaReward.json';
import { UserWalletGraphql } from './user-wallet.graphql';

@Injectable()
export class MasterWalletService implements OnModuleInit {
  private readonly logger = new Logger(MasterWalletService.name);
  private masterHDWallet: HDNodeWallet = null;
  private masterWalletAddress = '';
  private levelingProxyContractAddress = '';
  private provider: JsonRpcProvider = null;
  private levelingContract: BaseContract = null;

  constructor(
    private configService: ConfigService,
    private userWalletGraphql: UserWalletGraphql,
    private sysKeyService: SysKeyService
  ) {
    this.levelingProxyContractAddress = this.configService.get<string>(
      'network.contractAddress.leveling'
    );
  }

  async onModuleInit() {
    await this.initMasterWallet();
  }

  async initMasterWallet() {
    // get from db
    const masterWalletData = await this.userWalletGraphql.getMasterWallet();
    const providerUrl = this.configService.get<string>('network.rpcEndpoint');
    this.provider = new JsonRpcProvider(providerUrl);

    if (masterWalletData) {
      const phrase = this.decryptPhrase(masterWalletData.data);
      const wallet = Wallet.fromPhrase(phrase, this.provider);

      this.masterHDWallet = wallet;
      this.masterWalletAddress = wallet.address;
    } else {
      const { wallet, address, cipherPhrase } =
        await this.sysKeyService.randomWallet(this.provider);

      this.masterHDWallet = wallet;
      this.masterWalletAddress = address;

      // store db
      const result = await this.userWalletGraphql.insertManyUserWallet({
        objects: [
          {
            address,
            data: cipherPhrase,
            is_master_wallet: true,
          },
        ],
      });
      this.logger.debug(`Insert master wallet: ${JSON.stringify(result)}`);
    }
  }

  async getMasterWallet() {
    if (this.masterHDWallet && this.masterWalletAddress) {
      return {
        wallet: this.masterHDWallet,
        address: this.masterWalletAddress,
      };
    } else {
      return null;
    }
  }

  decryptPhrase(data: any) {
    return Crypter.decrypt(data, this.sysKeyService.originalSeed);
  }

  getLevelingContract(): any {
    if (this.levelingContract !== null) return this.levelingContract;

    try {
      // Connecting to smart contract
      const contract = new Contract(
        this.levelingProxyContractAddress,
        levelingAbi,
        this.provider
      );

      this.levelingContract = contract.connect(this.masterHDWallet);
      return this.levelingContract;
    } catch (error) {
      this.logger.error('get leveling contract err', error);
      throw error;
    }
  }
}

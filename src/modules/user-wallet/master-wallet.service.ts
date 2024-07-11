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
import { IChainInfo } from '../quest/interface/ichain-info';

@Injectable()
export class MasterWalletService implements OnModuleInit {
  private readonly logger = new Logger(MasterWalletService.name);
  private masterHDWallet: HDNodeWallet = null;
  private masterWalletAddress = '';
  private levelingContractMap: Map<number, Contract> = new Map();
  private chains: IChainInfo[] = [];

  constructor(
    private configService: ConfigService,
    private userWalletGraphql: UserWalletGraphql,
    private sysKeyService: SysKeyService
  ) {}

  async onModuleInit() {
    await this.initMasterWallet();

    const result = await this.userWalletGraphql.getAllChains();
    this.chains.push(...result.data.chains);
  }

  async initMasterWallet() {
    // get from db
    const masterWalletData = await this.userWalletGraphql.getMasterWallet();

    if (masterWalletData) {
      const phrase = this.decryptPhrase(masterWalletData.data);
      const wallet = Wallet.fromPhrase(phrase);

      this.masterHDWallet = wallet;
      this.masterWalletAddress = wallet.address;
    } else {
      const { wallet, address, cipherPhrase } =
        await this.sysKeyService.randomWallet();

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

  getLevelingContract(chainId: number): any {
    const levelingContract = this.levelingContractMap.get(chainId);
    if (levelingContract) return levelingContract;

    try {
      const chain = this.chains.find((chain) => chain.id === chainId);
      const provider = new JsonRpcProvider(chain.rpc);
      // Connecting to smart contract
      const contract = new Contract(
        chain.contracts.leveling_contract,
        levelingAbi,
        provider
      );

      const wallet = this.masterHDWallet.connect(provider);

      const levelingContract = contract.connect(wallet) as Contract;
      this.levelingContractMap.set(chainId, levelingContract);
      return levelingContract;
    } catch (error) {
      this.logger.error('get leveling contract err', error);
      throw error;
    }
  }
}

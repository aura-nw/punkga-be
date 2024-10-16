import { Contract, HDNodeWallet, JsonRpcProvider, Wallet } from 'ethers';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HDAccount, mnemonicToAccount } from 'viem/accounts';
import { Crypter } from '../../utils/crypto';
import { SysKeyService } from '../keys/syskey.service';
import { IChainInfo } from '../quest/interface/ichain-info';
import { abi as levelingAbi } from './../../abi/PunkgaReward.json';
import { abi as storyEventAbi } from './../../abi/StoryEvent.json';
import { UserWalletGraphql } from './user-wallet.graphql';

@Injectable()
export class MasterWalletService implements OnModuleInit {
  private readonly logger = new Logger(MasterWalletService.name);
  private masterHDWallet: HDNodeWallet = null;
  private masterWalletAddress = '';
  private levelingContractMap: Map<string, Contract> = new Map();
  private chains: IChainInfo[] = [];
  private storyEventContract: Contract;
  private account: HDAccount;

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
      this.account = mnemonicToAccount(phrase);

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

  getLevelingContract(contractAddress: string, provider: JsonRpcProvider): any {
    const levelingContract = this.levelingContractMap.get(contractAddress);
    if (levelingContract) {
      return levelingContract.connect(this.masterHDWallet.connect(provider));
    }

    try {
      // const chain = this.chains.find((chain) => chain.id === chainId);
      // const provider = new JsonRpcProvider(chain.rpc);
      // Connecting to smart contract
      const contract = new Contract(contractAddress, levelingAbi);
      this.levelingContractMap.set(contractAddress, contract);

      const wallet = this.masterHDWallet.connect(provider);
      const levelingContract = contract.connect(wallet) as Contract;

      return levelingContract;
    } catch (error) {
      this.logger.error('get leveling contract err', error);
      throw error;
    }
  }

  getStoryEventContract(
    contractAddress: string,
    provider: JsonRpcProvider
  ): any {
    const storyEventContract = this.storyEventContract;
    if (storyEventContract) {
      return storyEventContract.connect(this.masterHDWallet.connect(provider));
    }

    try {
      // Connecting to smart contract
      const contract = new Contract(contractAddress, storyEventAbi);
      this.storyEventContract = contract;

      const wallet = this.masterHDWallet.connect(provider);
      return contract.connect(wallet) as Contract;
    } catch (error) {
      this.logger.error('get story event contract err', error);
      throw error;
    }
  }

  getAccount(): HDAccount {
    return this.account;
  }
}

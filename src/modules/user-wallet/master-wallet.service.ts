import { BaseContract, Contract, JsonRpcProvider, Wallet } from 'ethers';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Crypter } from '../../utils/crypto';
import { SysKeyService } from '../keys/syskey.service';
import { abi as levelingAbi } from './../../abi/PunkgaReward.json';

@Injectable()
export class MasterWalletService {
  private readonly logger = new Logger(MasterWalletService.name);
  private masterWallet: Wallet = null;
  private masterWalletAddress = '';
  private levelingProxyContractAddress = '';
  private provider: JsonRpcProvider = null;
  private levelingContract: BaseContract = null;

  constructor(
    private configService: ConfigService,
    private sysKeyService: SysKeyService
  ) {
    this.levelingProxyContractAddress = this.configService.get<string>(
      'network.contractAddress.leveling'
    );

    const masterWalletPK = this.configService.get<string>('masterPK');
    const providerUrl = this.configService.get<string>('network.rpcEndpoint');
    this.provider = new JsonRpcProvider(providerUrl);

    // Connecting to provider
    this.masterWallet = new Wallet(masterWalletPK, this.provider);
    this.masterWalletAddress = this.masterWallet.address;
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

  getLevelingContract(): any {
    if (this.levelingContract !== null) return this.levelingContract;

    try {
      // Connecting to smart contract
      const contract = new Contract(
        this.levelingProxyContractAddress,
        levelingAbi,
        this.provider
      );

      this.levelingContract = contract.connect(this.masterWallet);
      return this.levelingContract;
    } catch (error) {
      this.logger.error('get leveling contract err', error);
      throw error;
    }
  }
}

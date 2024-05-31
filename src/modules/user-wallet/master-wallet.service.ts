import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SysKeyService } from '../keys/syskey.service';
import { Crypter } from '../../utils/crypto';
import { JsonRpcProvider, Wallet } from 'ethers';

@Injectable()
export class MasterWalletService {
  private readonly logger = new Logger(MasterWalletService.name);
  private masterWallet = null;
  private masterWalletAddress = '';

  constructor(
    private configService: ConfigService,
    private sysKeyService: SysKeyService
  ) {
    const masterWalletPK = this.configService.get<string>('masterPK');
    const providerUrl = this.configService.get<string>('network.rpcEndpoint');
    const provider = new JsonRpcProvider(providerUrl);
    this.masterWallet = new Wallet(masterWalletPK, provider);
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

  //   async broadcastTx(messages: any) {
  //     // const result = await this.client.signAndBroadcast(
  //     //   this.masterWalletAddress,
  //     //   messages,
  //     //   'auto',
  //     //   'punkga'
  //     // );
  //     // this.logger.debug(result);
  //     // return result;
  //   }
  // }
}

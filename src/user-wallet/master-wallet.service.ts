import { Secp256k1HdWallet } from '@cosmjs/amino';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { SysKeyService } from '../keys/syskey.service';
import { UserWalletGraphql } from './user-wallet.graphql';
import { UserWalletService } from './user-wallet.service';

@Injectable()
export class MasterWalletService implements OnModuleInit {
  private readonly logger = new Logger(MasterWalletService.name);
  private masterWallet = null;

  constructor(
    private userWalletGraphql: UserWalletGraphql,
    private sysKeyService: SysKeyService,
    private userWalletService: UserWalletService
  ) {}

  // init master wallet
  async onModuleInit() {
    // get from db
    const masterWalletData = await this.userWalletGraphql.getMasterWallet();
    if (masterWalletData) {
      const serialization = JSON.stringify({
        type: 'secp256k1wallet-v1',
        kdf: {
          algorithm: 'argon2id',
          params: { outputLength: 32, opsLimit: 24, memLimitKib: 12288 },
        },
        encryption: { algorithm: 'xchacha20poly1305-ietf' },
        data: masterWalletData.data,
      });
      const wallet = await Secp256k1HdWallet.deserialize(
        serialization,
        this.sysKeyService.originalSeed
      );
      this.masterWallet = wallet;
    } else {
      const { wallet, account, serializedWallet } =
        await this.userWalletService.randomWallet();
      this.masterWallet = wallet;
      // store db
      const result = await this.userWalletGraphql.insertManyUserWallet({
        objects: [
          {
            address: account[0].address,
            data: JSON.parse(serializedWallet).data,
            is_master_wallet: true,
          },
        ],
      });
      this.logger.debug(`Insert master wallet: ${JSON.stringify(result)}`);
    }
  }
}

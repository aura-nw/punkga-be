import { Secp256k1HdWallet } from '@cosmjs/amino';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SysKeyService } from '../keys/syskey.service';
import { UserWalletGraphql } from './user-wallet.graphql';
import { UserWalletService } from './user-wallet.service';

@Injectable()
export class MasterWalletService implements OnModuleInit {
  private readonly logger = new Logger(MasterWalletService.name);
  private masterWallet = null;
  private masterWalletAddress = '';

  constructor(
    private configService: ConfigService,
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
      const account = await wallet.getAccounts();

      this.masterWallet = wallet;
      this.masterWalletAddress = account[0].address;
    } else {
      const { wallet, account, serializedWallet } =
        await this.userWalletService.randomWallet();

      this.masterWallet = wallet;
      this.masterWalletAddress = account[0].address;

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

  async updateUserLevel(userAddress: string, xp: number, level: number) {
    const rpcEndpoint = this.configService.get<string>('network.rpcEndpoint');
    const gasPrice = GasPrice.fromString(
      this.configService.get<string>('network.gasPrice')
    );
    const contractAddress = this.configService.get<string>(
      'network.contractAddress.leveling'
    );

    const client = await SigningCosmWasmClient.connectWithSigner(
      rpcEndpoint,
      this.masterWallet,
      {
        gasPrice,
      }
    );

    const result = client.execute(
      this.masterWalletAddress,
      contractAddress,
      {
        UpdateUserInfo: {
          address: userAddress,
          level,
          total_xp: xp,
        },
      },
      'auto'
    );

    this.logger.debug(result);
    return result;
  }
}

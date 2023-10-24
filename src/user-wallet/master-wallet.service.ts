import { Secp256k1HdWallet, StdFee } from '@cosmjs/amino';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice, calculateFee } from '@cosmjs/stargate';
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
  private contractAddress: string;
  private executeFee: StdFee;
  private client: SigningCosmWasmClient;

  constructor(
    private configService: ConfigService,
    private userWalletGraphql: UserWalletGraphql,
    private sysKeyService: SysKeyService,
    private userWalletService: UserWalletService
  ) {}

  // init master wallet
  async onModuleInit() {
    // use mnemonic
    // const systemMnemonic = this.configService.get<string>(
    //   'network.systemMnemonic'
    // );
    // const wallet = await Secp256k1HdWallet.fromMnemonic(systemMnemonic, {
    //   prefix: 'aura',
    // });
    // const account = await wallet.getAccounts();
    // this.masterWallet = wallet;
    // this.masterWalletAddress = account[0].address;

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

    const gasPrice = GasPrice.fromString(
      this.configService.get<string>('network.gasPrice')
    );
    this.executeFee = calculateFee(300_000, gasPrice);
    this.contractAddress = this.configService.get<string>(
      'network.contractAddress.leveling'
    );

    // build client
    const rpcEndpoint = this.configService.get<string>('network.rpcEndpoint');
    this.client = await SigningCosmWasmClient.connectWithSigner(
      rpcEndpoint,
      this.masterWallet,
      {
        gasPrice,
      }
    );
  }

  async updateUserLevel(userAddress: string, xp: number, level: number) {
    const result = await this.client.execute(
      this.masterWalletAddress,
      this.contractAddress,
      {
        update_user_info: {
          address: userAddress,
          level,
          total_xp: xp,
        },
      },
      this.executeFee
    );

    this.logger.debug(result);
    return result;
  }
}

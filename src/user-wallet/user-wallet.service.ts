import * as bip39 from 'bip39';

import { Secp256k1HdWallet } from '@cosmjs/amino';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SysKeyService } from '../keys/syskey.service';
import { GenerateWalletRequestDto } from './dto/generate-wallet-request.dto';
import { UserWalletGraphql } from './user-wallet.graphql';

@Injectable()
export class UserWalletService implements OnModuleInit {
  private readonly logger = new Logger(UserWalletService.name);
  private masterWallet = null;
  constructor(
    private configService: ConfigService,
    private userWalletGraphql: UserWalletGraphql,
    private sysKeyService: SysKeyService
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
        data: masterWalletData,
      });
      const wallet = await Secp256k1HdWallet.deserialize(
        serialization,
        this.sysKeyService.originalSeed
      );
      this.masterWallet = wallet;
    } else {
      const { wallet, account, serializedWallet } = await this.randomWallet();
      this.masterWallet = wallet;
      // store db
      const result = await this.userWalletGraphql.insertUserWallet({
        address: account[0].address,
        data: JSON.parse(serializedWallet).data,
        is_master_wallet: true,
      });
      this.logger.debug(`Insert master wallet: ${result}`);
    }
  }

  async generateWallet(headers: any, data: GenerateWalletRequestDto) {
    const webHookSecret = this.configService.get<string>('webhook.secret');
    if (!webHookSecret || headers['webhook-secret'] !== webHookSecret)
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    const { user_id: userId } = data;

    const { account, serializedWallet } = await this.randomWallet();

    // store db
    const result = await this.userWalletGraphql.insertUserWallet({
      address: account[0].address,
      data: JSON.parse(serializedWallet).data,
      user_id: userId,
    });

    return result;
  }

  async randomWallet() {
    const mnemonic = bip39.generateMnemonic();
    const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: 'aura',
    });

    const account = await wallet.getAccounts();
    const serializedWallet = await wallet.serialize(
      this.sysKeyService.originalSeed
    );

    return {
      wallet,
      serializedWallet,
      account,
    };
  }
}

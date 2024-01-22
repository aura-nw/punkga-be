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
  constructor(
    private configService: ConfigService,
    private userWalletGraphql: UserWalletGraphql,
    private sysKeyService: SysKeyService
  ) { }

  async onModuleInit() {
    await this.insertAllUserWallet();
  }

  async insertAllUserWallet() {

    const users = await this.userWalletGraphql.queryAllUser();

    do {
      const batch = users.splice(0, 10);
      await this.insertUserWallet(batch);
    } while (users.length > 0);

  }

  async insertUserWallet(data: any) {
    const wallets = await Promise.all(
      data.map(() => {
        return this.randomWallet();
      })
    );

    const objects = wallets.map((wallet, index) => ({
      address: wallet.account[0].address,
      data: JSON.parse(wallet.serializedWallet).data,
      user_id: data[index].id,
    }));

    await this.userWalletGraphql.insertManyUserWallet({
      objects,
    });
  }

  async generateWallet(headers: any, data: GenerateWalletRequestDto) {
    const webHookSecret = this.configService.get<string>('webhook.secret');
    if (!webHookSecret || headers['webhook-secret'] !== webHookSecret)
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    const { user_id: userId } = data;

    const { account, serializedWallet } = await this.randomWallet();

    // store db
    const result = await this.userWalletGraphql.insertManyUserWallet({
      objects: [
        {
          address: account[0].address,
          data: JSON.parse(serializedWallet).data,
          user_id: userId,
        },
      ],
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

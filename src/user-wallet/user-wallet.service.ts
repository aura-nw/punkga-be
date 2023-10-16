import * as bip39 from 'bip39';

import { Secp256k1HdWallet } from '@cosmjs/amino';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SysKeyService } from '../keys/syskey.service';
import { GenerateWalletRequestDto } from './dto/generate-wallet-request.dto';
import { UserWalletGraphql } from './user-wallet.graphql';

@Injectable()
export class UserWalletService {
  private readonly logger = new Logger(UserWalletService.name);
  constructor(
    private configService: ConfigService,
    private userWalletGraphql: UserWalletGraphql,
    private sysKeyService: SysKeyService
  ) {
    // this.fillEmptyUserWallet();
  }

  async fillEmptyUserWallet() {
    const users = await this.userWalletGraphql.queryEmptyUserWallet();
    const wallets = await Promise.all(
      users.map(() => {
        return this.randomWallet();
      })
    );

    const objects = wallets.map((wallet, index) => ({
      address: wallet.account[0].address,
      data: JSON.parse(wallet.serializedWallet).data,
      user_id: users[index].id,
    }));

    const result = await this.userWalletGraphql.insertManyUserWallet({
      objects,
    });

    console.log(result);
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

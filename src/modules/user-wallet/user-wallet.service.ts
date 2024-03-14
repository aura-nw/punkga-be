import * as bip39 from 'bip39';

import { Secp256k1HdWallet } from '@cosmjs/amino';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SysKeyService } from '../keys/syskey.service';
import { RedisService } from '../redis/redis.service';
import { GenerateWalletRequestDto } from './dto/generate-wallet-request.dto';
import { UserWalletGraphql } from './user-wallet.graphql';

@Injectable()
export class UserWalletService {
  private readonly logger = new Logger(UserWalletService.name);
  constructor(
    private configService: ConfigService,
    private userWalletGraphql: UserWalletGraphql,
    private sysKeyService: SysKeyService,
    private redisClientService: RedisService,
  ) { }


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
    const variables = {
      objects: [
        {
          user_id: userId,
        },
      ],
    }
    const result = await this.userWalletGraphql.insertManyUserWallet(variables);
    const id = result.data.insert_user_wallet.returning[0].id;
    const redisData = {
      id,
      userId
    }

    this.redisClientService.client.rPush('punkga:generate-user-wallet', JSON.stringify(redisData))

    return {
      success: true,
    }
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

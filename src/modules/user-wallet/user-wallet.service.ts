import * as bip39 from 'bip39';

import { Secp256k1HdWallet } from '@cosmjs/amino';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SysKeyService } from '../keys/syskey.service';
import { RedisService } from '../redis/redis.service';
import { GenerateWalletRequestDto } from './dto/generate-wallet-request.dto';
import { UserWalletGraphql } from './user-wallet.graphql';
import { Cron, CronExpression } from '@nestjs/schedule';
import { errorOrEmpty } from '../graphql/utils';

@Injectable()
export class UserWalletService {
  private readonly logger = new Logger(UserWalletService.name);
  constructor(
    private configService: ConfigService,
    private userWalletGraphql: UserWalletGraphql,
    private sysKeyService: SysKeyService,
    private redisClientService: RedisService,
  ) {
    // this.handleEmptyUserWallet()
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleEmptyUserWallet() {
    const result = await this.userWalletGraphql.getNullUserWallets();
    if (!errorOrEmpty(result, 'user_wallet')) {
      result.data.user_wallet.forEach((userWallet) => {
        const redisData = {
          id: userWallet.id,
          userId: userWallet.user_id
        }
        const env = this.configService.get<string>('app.env') || 'prod';
        this.redisClientService.client.rPush(`punkga-${env}:generate-user-wallet`, JSON.stringify(redisData))
      });
    }
  }


  async insertAllUserWallet() {
    let count = 0;
    let offset = 0;

    do {
      const users = await this.userWalletGraphql.queryAllUser(offset);
      console.log(`user length: ${users.length}`);
      count = users.length;
      offset += count;
      const filtedUsers = users.filter((user) => user.authorizer_users_user_wallet === null || user.authorizer_users_user_wallet.address === null);
      console.log(`filter length: ${filtedUsers.length}`);
      const results = await Promise.all(filtedUsers.map((user) => {
        const variables = {
          objects: [
            {
              user_id: user.id,
            },
          ],
        }
        return this.userWalletGraphql.insertManyUserWallet(variables);
      }));

      results.forEach((result, index) => {
        const userWalletId = result.data.insert_user_wallet.returning[0].id;
        const redisData = {
          id: userWalletId,
          userId: users[index].id
        }
        const env = this.configService.get<string>('app.env') || 'prod';
        this.redisClientService.client.rPush(`punkga-${env}:generate-user-wallet`, JSON.stringify(redisData))
      })

    } while (count > 0);

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

    const env = this.configService.get<string>('app.env') || 'prod';
    this.redisClientService.client.rPush(`punkga-${env}:generate-user-wallet`, JSON.stringify(redisData))

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

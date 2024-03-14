
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { SysKeyService } from '../keys/syskey.service';
import { RedisService } from '../redis/redis.service';
import { IGenerateUserWallet } from './interfaces/generate-user-wallet.interface';
import { UserWalletGraphql } from './user-wallet.graphql';

@Injectable()
export class UserWalletProcessor {
  private readonly logger = new Logger(UserWalletProcessor.name);

  constructor(
    private sysKeyService: SysKeyService,
    private redisClientService: RedisService,
    private userWalletGraphql: UserWalletGraphql,
  ) { }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async generateUserWallet() {

    const redisData = await this.redisClientService.popListRedis('punkga:generate-user-wallet', 50);
    if (redisData.length === 0) return true;

    const data = redisData.map(data => JSON.parse(data) as IGenerateUserWallet);

    const wallets = await this.generateWallets(data);

    const insertObjects = wallets.map(({ account, serializedWallet }, index) => ({
      address: account[0].address,
      data: JSON.parse(serializedWallet).data,
      user_id: data[index].userId,
    }));

    // store db
    const result = await this.userWalletGraphql.insertManyUserWallet({
      objects: insertObjects
    });

    this.logger.debug(`Insert user wallet result ${JSON.stringify(result)}`);
  }

  async generateWallets(data: IGenerateUserWallet[]) {
    this.logger.debug(`starting generate account..`)
    const wallets = await Promise.all(data.map((data) => this.sysKeyService.generateWallet(data.id)));

    const accounts = await Promise.all(wallets.map(async (wallet) => wallet.getAccounts()));

    const serializedWallets = await Promise.all(wallets.map(async (wallet) => wallet.serialize(
      this.sysKeyService.originalSeed
    )));

    this.logger.debug(`generate account done!`)

    return wallets.map((wallet, index) => ({
      wallet,
      serializedWallet: serializedWallets[index],
      account: accounts[index]
    }));
  }


}

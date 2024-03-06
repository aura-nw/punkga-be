import * as bip39 from 'bip39';

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { RedisService } from "../redis/redis.service";
import { Secp256k1HdWallet } from "@cosmjs/amino";
import { SysKeyService } from '../keys/syskey.service';
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

    const redisData = await this.redisClientService.popListRedis('punkga:genereate-user-wallet', 50);
    if (redisData.length === 0) return true;

    const wallets = await this.randomWallets(redisData.length);

    const insertObjects = wallets.map(({ account, serializedWallet }, index) => ({
      address: account[0].address,
      data: JSON.parse(serializedWallet).data,
      user_id: redisData[index],
    }));

    // store db
    const result = await this.userWalletGraphql.insertManyUserWallet({
      objects: insertObjects
    });

    this.logger.debug(`Insert user wallet result ${JSON.stringify(result)}`);
  }

  async randomWallets(amount: number) {
    this.logger.debug(`starting generate account..`)
    const mnemonics = [...Array(amount)].map(() => bip39.generateMnemonic());
    const wallets = await Promise.all(mnemonics.map((mnemonic) => Secp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: 'aura',
    })));

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

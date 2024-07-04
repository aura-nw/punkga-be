import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { SysKeyService } from '../keys/syskey.service';
import { RedisService } from '../redis/redis.service';
import { IGenerateUserWallet } from './interfaces/generate-user-wallet.interface';
import { UserWalletGraphql } from './user-wallet.graphql';
import { ConfigService } from '@nestjs/config';
import { Wallet } from 'ethers';

@Injectable()
export class UserWalletProcessor implements OnModuleInit {
  private readonly logger = new Logger(UserWalletProcessor.name);
  private chains: any[] = [];

  constructor(
    private configService: ConfigService,
    private sysKeyService: SysKeyService,
    private redisClientService: RedisService,
    private userWalletGraphql: UserWalletGraphql
  ) {}

  async onModuleInit() {
    // get all chain
    const result = await this.userWalletGraphql.getAllChains();
    this.chains = result.data.chains;
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async generateUserWallet() {
    const env = this.configService.get<string>('app.env') || 'prod';
    const redisData = await this.redisClientService.popListRedis(
      `punkga-${env}:generate-user-wallet`,
      50
    );
    if (redisData.length === 0) return true;

    const data = redisData.map(
      (data) => JSON.parse(data) as IGenerateUserWallet
    );

    const wallets = this.generateWallets(data);
    const insertObjects = wallets.map(
      ({ userId, cipherPhrase, addressesData }) => ({
        custodial_wallet_addresses: {
          data: addressesData,
        },
        data: cipherPhrase,
        user_id: userId,
      })
    );

    // store db
    const result = await this.userWalletGraphql.insertManyUserWallet({
      objects: insertObjects,
    });

    this.logger.debug(`Insert user wallet result ${JSON.stringify(result)}`);
  }

  generateWallets(data: IGenerateUserWallet[]) {
    this.logger.debug(`starting generate account..`);
    return data.map((data) => {
      const { phrase, cipherPhrase } = this.sysKeyService.randomPhrase();
      // generate address for all chain
      const addressesData = this.chains.map((chain) => {
        const wallet = Wallet.fromPhrase(phrase);
        return {
          chain_id: chain.id,
          address: wallet.address,
          address_type: 'evm',
          user_id: data.userId,
        };
      });
      // const { cipherPhrase, address } = this.sysKeyService.generateWallet();
      return {
        userId: data.userId,
        cipherPhrase,
        addressesData,
      };
    });
  }
}

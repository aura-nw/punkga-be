import { Process, Processor } from '@nestjs/bull';
import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../redis/redis.service';
import { UserWalletService } from '../user-wallet/user-wallet.service';
import { ICustodialWalletAsset } from './interfaces/account-onchain.interface';
import { UserGraphql } from './user.graphql';
import { UserWalletGraphql } from '../user-wallet/user-wallet.graphql';
import { ChainGatewayService } from '../../chain-gateway/chain-gateway.service';

type MigrateWalletType = {
  requestId: number;
  userId: string;
};

@Processor('userWallet')
export class UserWalletProcessor implements OnModuleInit {
  private readonly logger = new Logger(UserWalletProcessor.name);
  private chains: any[] = [];

  constructor(
    private configService: ConfigService,
    private redisClientService: RedisService,
    private userWalletService: UserWalletService,
    private userGraphql: UserGraphql,
    private userWalletGraphql: UserWalletGraphql,
    private chainGatewaySvc: ChainGatewayService
  ) {}

  async onModuleInit() {
    // get all chain
    const result = await this.userWalletGraphql.getAllChains();
    this.chains = result.data.chains;
  }

  /**
   * migrate wallet data in all chain
   * @returns
   */
  @Process({ name: 'migrate-wallet', concurrency: 1 })
  async migrateWallet() {
    const env = this.configService.get<string>('app.env') || 'prod';
    const redisData = await this.redisClientService.popListRedis(
      `punkga-${env}:migrate-user-wallet`,
      1
    );
    if (redisData.length === 0) return true;

    // parse redis data
    const { userId, requestId } = redisData.map(
      (dataStr) => JSON.parse(dataStr) as MigrateWalletType
    )[0];

    try {
      // get all user wallet address
      const user = await this.userGraphql.adminGetUserAddress({
        id: userId,
      });
      const custodialWalletAddress = user.authorizer_users_user_wallet.address;
      const result: any[] = [];

      for (let i = 0; i < this.chains.length; i++) {
        const currentChain = this.chains[i];
        let chain = 'aura';

        if (currentChain.name.toLocaleLowerCase().includes('klaytn')) {
          this.chainGatewaySvc.configuaration(
            'klaytn',
            currentChain.rpc,
            currentChain.contracts.leveling_contract
          );
          chain = 'klaytn';
        } else if (currentChain.name.toLocaleLowerCase().includes('aura')) {
          this.chainGatewaySvc.configuaration(
            'aura',
            currentChain.rpc,
            currentChain.contracts.leveling_contract
          );
          chain = 'aura';
        } else {
          throw new Error('chain not support');
        }

        // check asset in custodial wallet
        const custodialWalletAsset = await this.chainGatewaySvc.getWalletAsset(
          chain,
          custodialWalletAddress
        );

        const txs: string[] = [];
        // update user xp
        const updateXpHash = await this.chainGatewaySvc.updateUserXp(
          chain,
          user.wallet_address,
          user.levels[0]?.level || 0,
          user.levels[0]?.xp || 0
        );
        if (updateXpHash) txs.push(updateXpHash);

        if (this.isEmptyWallet(custodialWalletAsset)) {
          this.logger.debug(
            `chain ${chain} wallet ${user.authorizer_users_user_wallet.address}: empty`
          );
        } else {
          // faucet
          const custodialWalletBalance = Number(
            custodialWalletAsset.balance?.amount || 0
          );

          const availableBalance = await this.chainGatewaySvc.faucet(
            chain,
            custodialWalletAddress,
            custodialWalletBalance
          );

          // transfer asset
          const { wallet } = await this.userWalletService.deserialize(userId);

          // send native token
          const sendTokenHash = await this.chainGatewaySvc.sendNativeToken(
            chain,
            custodialWalletAsset,
            availableBalance,
            wallet,
            user.wallet_address
          );
          if (sendTokenHash) txs.push(sendTokenHash);

          // send nft
          const transferNftHashes = await this.chainGatewaySvc.sendNft(
            chain,
            custodialWalletAsset,
            wallet,
            custodialWalletAddress,
            user.wallet_address
          );
          if (transferNftHashes.length > 0) txs.push(...transferNftHashes);
        }

        result.push({
          chain,
          txs,
        });
      }
      // update request
      await this.userGraphql.updateRequestLogs({
        ids: [requestId],
        log: JSON.stringify(result),
        status: 'SUCCEEDED',
      });

      this.logger.debug(`Migrate wallet success!!!`);
    } catch (error) {
      this.logger.error(error.toString());
      await this.userGraphql.updateRequestLogs({
        ids: [requestId],
        log: error.toString(),
        status: 'FAILED',
      });
    }
  }

  isEmptyWallet(walletAsset: ICustodialWalletAsset) {
    if (walletAsset.balance && Number(walletAsset.balance.amount) > 0)
      return false;

    if (walletAsset.cw721Tokens.length > 0) return false;

    return true;
  }
}

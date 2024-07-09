import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../redis/redis.service';
import { SystemCustodialWalletService } from '../system-custodial-wallet/system-custodial-wallet.service';
import { MasterWalletService } from '../user-wallet/master-wallet.service';
import { UserWalletService } from '../user-wallet/user-wallet.service';
import {
  ICustodialWalletAsset,
  ICw721Token,
} from './interfaces/account-onchain.interface';
import { UserGraphql } from './user.graphql';

type MigrateWalletType = {
  requestId: number;
  userId: string;
};

@Processor('userWallet')
export class UserWalletProcessor {
  private readonly logger = new Logger(UserWalletProcessor.name);

  constructor(
    private configService: ConfigService,
    private redisClientService: RedisService,
    private userWalletService: UserWalletService,
    private masterWalletService: MasterWalletService,
    private userGraphql: UserGraphql,
    private systemWalletSvc: SystemCustodialWalletService
  ) {}

  @Process({ name: 'migrate-wallet', concurrency: 1 })
  async migrateWallet() {
    const env = this.configService.get<string>('app.env') || 'prod';
    const redisData = await this.redisClientService.popListRedis(
      `punkga-${env}:migrate-user-wallet`,
      1
    );
    if (redisData.length === 0) return true;

    const { userId, requestId } = redisData.map(
      (dataStr) => JSON.parse(dataStr) as MigrateWalletType
    )[0];

    try {
      // get user wallet
      const user = await this.userGraphql.adminGetUserAddress({
        id: userId,
      });

      if (!user.wallet_address || user.wallet_address === '')
        throw new Error('User address is empty');
      if (
        !user.authorizer_users_user_wallet.address ||
        user.authorizer_users_user_wallet.address === ''
      )
        throw new Error('User custodial address is empty');
      const custodialWalletAddress = user.authorizer_users_user_wallet.address;

      // check asset in custodial wallet
      const custodialWalletAsset =
        await this.userGraphql.queryCustodialWalletAsset(
          custodialWalletAddress
        );
      if (!this.isEmptyWallet(custodialWalletAsset)) {
        // fee grant
        // transfer token from granter wallet to user custodial wallet
        // check wallet balance
        const fee = 0.1 * 10 ** 6;
        const availableBalance =
          Number(custodialWalletAsset.balance?.amount || 0) - fee;

        if (availableBalance < 0)
          await this.systemWalletSvc.faucet(custodialWalletAddress);

        // transfer asset
        const txsPromise = [];
        const { wallet } = await this.userWalletService.deserialize(userId);

        // update user xp
        const contractWithMasterWallet =
          this.masterWalletService.getLevelingContract();
        const updateXpTx = await contractWithMasterWallet.updateUserInfo(
          user.wallet_address,
          user.levels[0]?.level || 0,
          user.levels[0]?.xp || 0
        );
        txsPromise.push(updateXpTx.wait());

        // send native token
        if (
          !!custodialWalletAsset.balance &&
          Number(custodialWalletAsset.balance.amount) > 0 &&
          availableBalance > 0
        ) {
          const evmAvailableBalance = (availableBalance * 10 ** 12).toString();
          const nonce = await wallet.getNonce();
          const tx = await wallet.sendTransaction({
            nonce,
            to: user.wallet_address,
            value: evmAvailableBalance,
          });

          txsPromise.push(tx.wait());
        }

        // send nft
        if (custodialWalletAsset.cw721Tokens.length > 0) {
          const contract = this.userWalletService.getLevelingContract(wallet);
          const nftContractAddress = this.configService.get<string>(
            'network.contractAddress.leveling'
          );
          const transferNftTxsPromises = [];
          transferNftTxsPromises.push(
            ...custodialWalletAsset.cw721Tokens
              .filter(
                (token) =>
                  token.contractAddress.toLocaleLowerCase() ===
                  nftContractAddress.toLocaleLowerCase()
              )
              .map((token: ICw721Token) => {
                return contract.safeTransferFrom(
                  custodialWalletAddress,
                  user.wallet_address,
                  token.tokenId
                );
                // return tx.wait();
              })
          );
          const transferNftTxs = await Promise.all(transferNftTxsPromises);
          txsPromise.push(...transferNftTxs.map((tx) => tx.wait()));
        }

        // get result txs
        const result = await Promise.all(txsPromise);
        const txs = result.map((tx) => tx.hash);

        // update request
        await this.userGraphql.updateRequestLogs({
          ids: [requestId],
          log: JSON.stringify(txs),
          status: 'SUCCEEDED',
        });

        this.logger.debug(`Migrate wallet success!!!`);
      } else {
        this.logger.debug(
          `Wallet ${user.authorizer_users_user_wallet.address} empty`
        );
        // update request
        await this.userGraphql.updateRequestLogs({
          ids: [requestId],
          log: 'Wallet empty',
          status: 'SUCCEEDED',
        });
      }
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

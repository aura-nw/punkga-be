import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../redis/redis.service';
import { SystemCustodialWalletService } from '../system-custodial-wallet/system-custodial-wallet.service';
import { MasterWalletService } from '../user-wallet/master-wallet.service';
import { UserWalletService } from '../user-wallet/user-wallet.service';
import { ICustodialWalletAsset } from './interfaces/account-onchain.interface';
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
      const totalTxs: string[] = [];

      // update user xp
      const contractWithMasterWallet =
        this.masterWalletService.getLevelingContract();
      const updateXpTx = await contractWithMasterWallet.updateUserInfo(
        user.wallet_address,
        user.levels[0]?.level || 0,
        user.levels[0]?.xp || 0
      );

      const updateXpTxResult = await updateXpTx.wait();
      totalTxs.push(updateXpTxResult.hash);

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
        const { wallet } = await this.userWalletService.deserialize(userId);

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

          const sendNativeTxResult = await tx.wait();
          totalTxs.push(sendNativeTxResult.hash);
        }

        // send nft
        const transferNftHash = [];
        if (custodialWalletAsset.cw721Tokens.length > 0) {
          const contract = this.userWalletService.getLevelingContract(wallet);
          const nftContractAddress = this.configService.get<string>(
            'network.contractAddress.leveling'
          );

          const validTokens = custodialWalletAsset.cw721Tokens.filter(
            (token) =>
              token.contractAddress.toLocaleLowerCase() ===
              nftContractAddress.toLocaleLowerCase()
          );
          for (let i = 0; i < validTokens.length; i++) {
            const tx = await contract.safeTransferFrom(
              custodialWalletAddress,
              user.wallet_address,
              validTokens[i].tokenId
            );
            const result = await tx.wait();
            transferNftHash.push(result.hash);
          }
        }
        totalTxs.push(...transferNftHash);

        this.logger.debug(`Migrate wallet success!!!`);
      } else {
        this.logger.debug(
          `Wallet ${user.authorizer_users_user_wallet.address} empty`
        );
      }
      // update request
      await this.userGraphql.updateRequestLogs({
        ids: [requestId],
        log: JSON.stringify(totalTxs),
        status: 'SUCCEEDED',
      });
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

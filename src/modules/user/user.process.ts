import { Process, Processor } from '@nestjs/bull';
import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { SystemCustodialWalletService } from '../system-custodial-wallet/system-custodial-wallet.service';
import { UserWalletService } from '../user-wallet/user-wallet.service';
import {
  ICustodialWalletAsset,
  ICw721Token,
} from './interfaces/account-onchain.interface';
import { UserGraphql } from './user.graphql';
import { UserWalletGraphql } from '../user-wallet/user-wallet.graphql';
import { AddressType } from '../../common/enum';
import { MasterWalletService } from '../user-wallet/master-wallet.service';

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
    private masterWalletService: MasterWalletService,
    private userGraphql: UserGraphql,
    private userWalletGraphql: UserWalletGraphql,
    private systemWalletSvc: SystemCustodialWalletService
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

      // TODO: support kaia network
      for (let i = 0; i < this.chains.length; i++) {
        const currentChain = this.chains[i];
        // check asset in custodial wallet by call horoscope
        const custodialWalletAsset =
          await this.userGraphql.queryCustodialWalletAsset(
            custodialWalletAddress
          );

        if (this.isEmptyWallet(custodialWalletAsset)) {
          this.logger.debug(
            `Wallet ${user.authorizer_users_user_wallet.address} empty`
          );
          // update request
          await this.userGraphql.updateRequestLogs({
            ids: [requestId],
            log: 'Wallet empty',
            status: 'SUCCEEDED',
          });
        } else {
          // faucet
          const custodialWalletBalance = Number(
            custodialWalletAsset.balance?.amount || 0
          );

          const availableBalance = await this.evmFaucet(
            custodialWalletAddress,
            custodialWalletBalance
          );

          const txs: string[] = [];
          // update user xp
          const updateXpHash = await this.updateUserXp(
            currentChain.id,
            user.wallet_address,
            user.levels[0]?.level || 0,
            user.levels[0]?.xp || 0
          );
          if (updateXpHash) txs.push(updateXpHash);

          // transfer asset
          const { wallet } = await this.userWalletService.deserialize(userId);

          // send native token
          const sendTokenHash = await this.sendNativeToken(
            custodialWalletAsset,
            availableBalance,
            wallet,
            user.wallet_address
          );
          if (sendTokenHash) txs.push(sendTokenHash);

          // send nft
          const transferNftHashes = await this.sendNft(
            custodialWalletAsset,
            wallet,
            currentChain.contracts.leveling_contract,
            custodialWalletAddress,
            user.wallet_address
          );
          if (transferNftHashes.length > 0) txs.push(...transferNftHashes);

          // update request
          await this.userGraphql.updateRequestLogs({
            ids: [requestId],
            log: JSON.stringify(txs),
            status: 'SUCCEEDED',
          });

          this.logger.debug(`Migrate wallet success!!!`);
        }
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

  async evmFaucet(address: string, balance: number) {
    // faucet if wallet balance < fee required
    // transfer token from granter wallet to user custodial wallet
    // check wallet balance
    const fee = 0.1 * 10 ** 6;
    const availableBalance = balance - fee;

    if (availableBalance <= 0) await this.systemWalletSvc.faucet(address);

    return availableBalance;
  }

  async updateUserXp(
    chainId: number,
    wallet_address: string,
    level = 0,
    xp = 0
  ): Promise<string> {
    const contractWithMasterWallet =
      this.masterWalletService.getLevelingContract(chainId);
    const updateXpTx = await contractWithMasterWallet.updateUserInfo(
      wallet_address,
      level,
      xp
    );
    const tx = await updateXpTx.wait();
    return tx.hash;
  }

  /**
   * send native token  from custodial wallet to user wallet
   * @param custodialWalletAsset
   * @param availableBalance
   * @param wallet
   * @param to
   * @returns
   */
  async sendNativeToken(
    custodialWalletAsset: any,
    availableBalance: number,
    wallet: any,
    to: string
  ): Promise<string> {
    if (
      !!custodialWalletAsset.balance &&
      Number(custodialWalletAsset.balance.amount) > 0
    ) {
      const evmAvailableBalance = (availableBalance * 10 ** 12).toString();
      const nonce = await wallet.getNonce();
      const tx = await wallet.sendTransaction({
        nonce,
        to,
        value: evmAvailableBalance,
      });

      const txResult = tx.wait();
      return txResult.hash;
    }
  }

  async sendNft(
    custodialWalletAsset: any,
    wallet: any,
    contractAddress: string,
    from: string,
    to: string
  ): Promise<string[]> {
    const transferNftHash: string[] = [];
    if (custodialWalletAsset.cw721Tokens.length > 0) {
      const contract = this.userWalletService.getLevelingContract(
        wallet,
        contractAddress
      );
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
          from,
          to,
          validTokens[i].tokenId
        );
        const result = await tx.wait();
        transferNftHash.push(result.hash);
      }
    }

    return transferNftHash;
  }

  isEmptyWallet(walletAsset: ICustodialWalletAsset) {
    if (walletAsset.balance && Number(walletAsset.balance.amount) > 0)
      return false;

    if (walletAsset.cw721Tokens.length > 0) return false;

    return true;
  }
}

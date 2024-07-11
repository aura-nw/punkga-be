import {
  BaseContract,
  Contract,
  HDNodeWallet,
  JsonRpcProvider,
  Wallet,
} from 'ethers';

import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

// import { Secp256k1HdWallet } from '@cosmjs/amino';
import { abi as levelingAbi } from '../../abi/PunkgaReward.json';
import { errorOrEmpty } from '../graphql/utils';
// import { SysKeyService } from '../keys/syskey.service';
import { RedisService } from '../redis/redis.service';
import { GenerateWalletRequestDto } from './dto/generate-wallet-request.dto';
import { MasterWalletService } from './master-wallet.service';
import { UserWalletGraphql } from './user-wallet.graphql';

@Injectable()
export class UserWalletService {
  private readonly logger = new Logger(UserWalletService.name);
  private provider: JsonRpcProvider = null;

  constructor(
    private configService: ConfigService,
    private userWalletGraphql: UserWalletGraphql,
    private redisClientService: RedisService,
    private masterWalletService: MasterWalletService
  ) {
    const providerUrl = this.configService.get<string>('network.rpcEndpoint');
    this.provider = new JsonRpcProvider(providerUrl);
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleEmptyUserWallet() {
    const result = await this.userWalletGraphql.getNullUserWallets();
    if (!errorOrEmpty(result, 'user_wallet')) {
      result.data.user_wallet.forEach((userWallet) => {
        const redisData = {
          id: userWallet.id,
          userId: userWallet.user_id,
        };
        const env = this.configService.get<string>('app.env') || 'prod';
        this.redisClientService.client.rPush(
          `punkga-${env}:generate-user-wallet`,
          JSON.stringify(redisData)
        );
      });
    }
  }

  // webhook called from hasura when a new user created
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
    };
    const result = await this.userWalletGraphql.insertManyUserWallet(variables);
    const id = result.data.insert_user_wallet.returning[0].id;
    const redisData = {
      id,
      userId,
    };

    const env = this.configService.get<string>('app.env') || 'prod';
    this.redisClientService.client.rPush(
      `punkga-${env}:generate-user-wallet`,
      JSON.stringify(redisData)
    );

    return {
      success: true,
    };
  }

  // script insert all evm user wallet
  async insertAllUserWallet() {
    let count = 0;
    let offset = 0;

    do {
      const users = await this.userWalletGraphql.queryAllUser(offset);
      console.log(`user length: ${users.length}`);
      count = users.length;
      offset += count;
      const filtedUsers = users.filter(
        (user) =>
          user.authorizer_users_user_wallet === null ||
          user.authorizer_users_user_wallet.address === null
      );
      console.log(`filter length: ${filtedUsers.length}`);
      const results = await Promise.all(
        filtedUsers.map((user) => {
          const variables = {
            objects: [
              {
                user_id: user.id,
              },
            ],
          };
          return this.userWalletGraphql.insertManyUserWallet(variables);
        })
      );

      results.forEach((result, index) => {
        const userWalletId = result.data.insert_user_wallet.returning[0].id;
        const redisData = {
          id: userWalletId,
          userId: users[index].id,
        };
        const env = this.configService.get<string>('app.env') || 'prod';
        this.redisClientService.client.rPush(
          `punkga-${env}:generate-user-wallet`,
          JSON.stringify(redisData)
        );
      });
    } while (count > 0);
  }

  /**
   * decrypt user wallet for given user id
   * @param userId
   * @returns
   */
  async deserialize(userId: string) {
    const custodialUserWallet =
      await this.userWalletGraphql.getCustodialUserWallet(userId);
    if (!custodialUserWallet)
      throw new NotFoundException('Cannot find custodial wallet');

    const phrase = this.masterWalletService.decryptPhrase(
      custodialUserWallet.data
    );
    const wallet = Wallet.fromPhrase(phrase, this.provider);

    return {
      wallet,
      address: wallet.address,
    };
  }

  /**
   *
   * @param wallet get evm leveling contract for given wallet
   * @returns
   */
  getLevelingContract(wallet: HDNodeWallet, contractAddress: string): any {
    try {
      // Connecting to smart contract
      const contract = new Contract(
        contractAddress,
        levelingAbi,
        this.provider
      );

      const levelingContract = contract.connect(wallet);
      return levelingContract;
    } catch (error) {
      this.logger.error('get leveling contract err', error);
      throw error;
    }
  }
}

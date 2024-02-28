import { Process, Processor } from '@nestjs/bull';
import { ForbiddenException, Logger } from '@nestjs/common';
import { QuestGraphql } from './quest.graphql';
import { CheckRewardService } from './check-reward.service';
import { RewardStatus } from '../../common/enum';
import { QuestRewardService } from './reward.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { IRewardInfo } from './interface/ireward-info';
import { UserRewardInfo } from './user-reward';
import { LevelingService } from '../leveling/leveling.service';
import { MasterWalletService } from '../user-wallet/master-wallet.service';
import { UserLevelGraphql } from '../user-level/user-level.graphql';

@Processor('quest')
export class QuestProcessor {
  private readonly logger = new Logger(QuestProcessor.name);

  constructor(
    private configService: ConfigService,
    private questGraphql: QuestGraphql,
    private checkRewardService: CheckRewardService,
    private questRewardService: QuestRewardService,
    private redisClientService: RedisService,
    private levelingService: LevelingService,
    private masterWalletSerivce: MasterWalletService,
    private userLevelGraphql: UserLevelGraphql,
  ) { }


  @Process({ name: 'claim-reward', concurrency: 1 })
  async claimQuestReward() {
    const redisData = await this.popListRedis('punkga:reward-users');
    if (redisData.length === 0) return true;

    const listRewards = redisData.map((dataStr) => JSON.parse(dataStr) as IRewardInfo)

    const rewardMap = new Map<string, UserRewardInfo>();
    const messages = [];

    for (let i = 0; i < listRewards.length; i += 1) {
      const { userId, token, questId, requestId } = listRewards[i];

      const userReward = rewardMap.get(userId) ?? new UserRewardInfo(userId, token);


      const quest = await this.questGraphql.getQuestDetail({
        id: questId,
      });

      const rewardStatus = await this.checkRewardService.getClaimRewardStatus(
        quest,
        userId
      );
      if (rewardStatus !== RewardStatus.CanClaimReward)
        throw new ForbiddenException();

      if (quest.reward?.xp) {
        userReward.reward.xp += quest.reward?.xp
      }

      if (quest.reward?.nft && quest.reward?.nft.ipfs !== "") {
        const nftInfo = {
          name: quest.reward.nft.nft_name || '',
          image: quest.reward.nft.ipfs,
          tokenId: userId + Number(new Date()).toString()
        }
        userReward.reward.nft.push(nftInfo);
      }

      // danh dau quest nay da co 1 luot claim
      const userQuestId = await this.questRewardService.saveUserQuest(
        quest,
        userId,
        requestId
      );
      userReward.userQuestIds.push(userQuestId);
      userReward.requestIds.push(requestId);
      rewardMap.set(userId, userReward)
    }

    // create msg and execute contract
    for (const [key, value] of rewardMap.entries()) {
      // get user info by map key
      const user = await this.questGraphql.queryUserWalletData(
        {
          id: key,
        },
        value.token
      );

      // calculate total xp and level
      const currentXp = user.levels[0] ? user.levels[0].xp : 0;
      const xp = value.reward.xp ?? 0;
      const totalXp = currentXp + xp;
      // calculate level from xp
      const newLevel = this.levelingService.xpToLevel(totalXp);

      // build execute contract msg increase user xp and mint nft
      messages.push(this.masterWalletSerivce.generateIncreaseXpMsg(
        user.authorizer_users_user_wallet.address,
        totalXp,
        newLevel
      ));

      // update total xp to map value
      const updatedValue = { ...value };
      updatedValue.userXp = totalXp;
      updatedValue.userLevel = newLevel;
      rewardMap.set(key, updatedValue);

      // generate mint nft msg
      value.reward.nft.forEach((nftInfo) => {
        const msg = this.masterWalletSerivce.generateMintNftMsg(user.authorizer_users_user_wallet.address, nftInfo.tokenId, {
          image: nftInfo.image,
          name: nftInfo.name || '',
        });
        messages.push(msg);
      })
    }

    // execute contract
    try {
      const tx = await this.masterWalletSerivce.broadcastTx(messages);

      // update offchain db info

      const promises = [];
      for (const [, value] of rewardMap.entries()) {
        if (value.userXp > 0) {
          promises.push(this.userLevelGraphql.insertUserLevel(
            {
              user_id: value.userId,
              xp: value.userXp,
              level: value.userLevel,
            },
            value.token
          ));

          // this.logger.debug(JSON.stringify(result));
          // this.logger.log(`XP updated!!! id: ${value.userId} ${value.userXp} xp`)
        }

        promises.push(this.questRewardService.updateUserQuestReward(value.userQuestIds, tx.transactionHash))
        promises.push(this.questGraphql.updateRequestLogs({
          ids: value.requestIds,
          log: tx.transactionHash,
          status: 'SUCCEEDED'
        }))
      }

      // save reward history & request status
      await Promise.all(promises);

      this.logger.debug(`${rewardMap.size} users XP updated!!!`)

      // update request status
    } catch (error) {
      for (const [, value] of rewardMap.entries()) {
        await this.questGraphql.updateRequestLogs({
          ids: value.requestIds,
          log: error.toString(),
          status: 'FAILED'
        })
        this.logger.error(error.toString())
        return {
          error,
        };
      }

    }
  }

  // @Process('claim')
  // async handleClaimQuest(job: Job) {
  //   this.logger.debug('Start claiming...');

  //   const { userId, token, questId, requestId } = job.data;
  //   try {

  //     const quest = await this.questGraphql.getQuestDetail({
  //       id: questId,
  //     });

  //     const rewardStatus = await this.checkRewardService.getClaimRewardStatus(
  //       quest,
  //       userId
  //     );
  //     if (rewardStatus !== RewardStatus.CanClaimReward)
  //       throw new ForbiddenException();

  //     // const txs = [];

  //     // add user to redis waiting list
  //     await this.redisClientService.client.lPush(`punkga:reward-users`, userId);

  //     if (quest.reward?.xp) {
  //       // increase user xp in off-chain db
  //       await this.questRewardService.increaseUserXp(
  //         userId,
  //         quest,
  //         quest.reward?.xp,
  //         token
  //       );
  //     }

  //     if (quest.reward?.nft && quest.reward?.nft.ipfs !== "") {
  //       // mint nft
  //       // txs.push(await this.questRewardService.mintNft(userId, quest, token));

  //       const nftInfo = {
  //         name: quest.reward.nft.nft_name || '',
  //         image: quest.reward.nft.ipfs,
  //         tokenId: userId + Number(new Date()).toString()
  //       }
  //       // add nft to waiting list
  //       await this.redisClientService.client.lPush(`punkga:users:${userId}:nft`, JSON.stringify(nftInfo));

  //     }

  //     // save logs
  //     const insertUserRewardResult = await this.questRewardService.saveRewardHistory(
  //       quest,
  //       userId,
  //       []
  //     );
  //     this.questGraphql.updateRequestLog({
  //       id: requestId,
  //       log: JSON.stringify(insertUserRewardResult),
  //       status: 'SUCCEEDED'
  //     })

  //     this.logger.debug(insertUserRewardResult)

  //     this.logger.debug('Claiming completed');
  //     return insertUserRewardResult;

  //   } catch (error) {

  //     this.questGraphql.updateRequestLog({
  //       id: requestId,
  //       log: error.toString(),
  //       status: 'FAILED'
  //     })
  //     this.logger.error(error.toString())
  //     return {
  //       error,
  //     };
  //   }
  // }

  async popListRedis(key: string): Promise<string[]> {
    const batchAmount = this.configService.get<number>('redis.batchAmount') ?? 300;

    const redisData = await this.redisClientService.client.lRange(key, 0, batchAmount);
    const delResult = await this.redisClientService.client.lTrim(key, batchAmount + 1, -1);
    if (redisData.length > 0)
      this.logger.debug(`POP ${redisData.length} item ${key} - ${delResult}`);
    return redisData;
  }


}
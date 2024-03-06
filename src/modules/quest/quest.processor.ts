import { Process, Processor } from '@nestjs/bull';
import { ForbiddenException, Logger } from '@nestjs/common';
import { QuestGraphql } from './quest.graphql';
import { CheckRewardService } from './check-reward.service';
import { RewardStatus } from '../../common/enum';
import { QuestRewardService } from './reward.service';
import { RedisService } from '../redis/redis.service';
import { IRewardInfo } from './interface/ireward-info';
import { UserRewardInfo } from './user-reward';
import { LevelingService } from '../leveling/leveling.service';
import { MasterWalletService } from '../user-wallet/master-wallet.service';
import { UserLevelGraphql } from '../user-level/user-level.graphql';

@Processor('quest')
export class QuestProcessor {
  private readonly logger = new Logger(QuestProcessor.name);

  constructor(
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
    const redisData = await this.redisClientService.popListRedis('punkga:reward-users');
    if (redisData.length === 0) return true;

    const listRewards = redisData.map((dataStr) => JSON.parse(dataStr) as IRewardInfo)

    const rewardMap = await this.mapUserReward(listRewards);

    // create msg and execute contract
    const messages = await this.buildMessages(rewardMap);

    // execute contract
    try {
      const tx = await this.masterWalletSerivce.broadcastTx(messages);

      // update offchain db info
      await this.updateOffchainData(rewardMap, tx.transactionHash);
      this.logger.debug(`${rewardMap.size} users XP updated!!!`)

    } catch (error) {
      this.logger.error(JSON.stringify(error));
      await this.updateErrorRequest(rewardMap, error.toString());
    }
  }

  async mapUserReward(listRewards: any[]) {
    const rewardMap = new Map<string, UserRewardInfo>();

    for (let i = 0; i < listRewards.length; i += 1) {
      try {
        const { userId, questId, requestId } = listRewards[i];
        const userReward = rewardMap.get(userId) ?? new UserRewardInfo(userId);

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

      } catch (error) {
        await this.questGraphql.updateRequestLogs({
          ids: listRewards[i].requestId,
          log: error.toString(),
          status: 'FAILED'
        })
        this.logger.error(error.toString())
      }
    }

    return rewardMap;
  }

  async buildMessages(rewardMap: Map<string, UserRewardInfo>) {
    const messages = []

    try {
      for (const [key, value] of rewardMap.entries()) {
        // get user info by map key
        const user = await this.questGraphql.queryPublicUserWalletData(
          {
            id: key,
          },
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
    } catch (error) {
      this.logger.error(error)
    }

    return messages;
  }

  async updateOffchainData(rewardMap: Map<string, UserRewardInfo>, txHash: string) {
    const promises = [];
    for (const [, value] of rewardMap.entries()) {
      if (value.userXp > 0) {
        promises.push(this.userLevelGraphql.insertUserLevel(
          {
            user_id: value.userId,
            xp: value.userXp,
            level: value.userLevel,
          },
        ));
      }

      promises.push(this.questRewardService.updateUserQuestReward(value.userQuestIds, txHash))
      promises.push(this.questGraphql.updateRequestLogs({
        ids: value.requestIds,
        log: txHash,
        status: 'SUCCEEDED'
      }))
    }

    // save reward history & request status
    await Promise.all(promises);
  }

  async updateErrorRequest(rewardMap: Map<string, UserRewardInfo>, errorDetail: string) {
    for (const [, value] of rewardMap.entries()) {
      await this.questGraphql.updateRequestLogs({
        ids: value.requestIds,
        log: errorDetail,
        status: 'FAILED'
      })
    }
  }

}
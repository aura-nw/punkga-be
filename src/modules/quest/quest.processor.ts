// import { Contract, JsonRpcProvider } from 'ethers';

import { Process, Processor } from '@nestjs/bull';
import { ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RewardStatus } from '../../common/enum';
import { LevelingService } from '../leveling/leveling.service';
import { RedisService } from '../redis/redis.service';
import { UserLevelGraphql } from '../user-level/user-level.graphql';
import { MasterWalletService } from '../user-wallet/master-wallet.service';
import { CheckRewardService } from './check-reward.service';
// import * as ABI from './files/PunkgaReward.json';
import { IRewardInfo } from './interface/ireward-info';
import { QuestGraphql } from './quest.graphql';
import { QuestRewardService } from './reward.service';
import { UserCampaignXp, UserRewardInfo } from './user-reward';
import { chain, groupBy } from 'lodash';

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
    private userLevelGraphql: UserLevelGraphql
  ) {}

  @Process({ name: 'claim-reward', concurrency: 1 })
  async claimQuestReward() {
    const env = this.configService.get<string>('app.env') || 'prod';
    const redisData = await this.redisClientService.popListRedis(
      `punkga-${env}:reward-users`
    );
    if (redisData.length === 0) return true;
    const listRewards = redisData.map(
      (dataStr) => JSON.parse(dataStr) as IRewardInfo
    );

    // filter chain_id
    const chainReward = groupBy(listRewards, (item) => item.chainId);
    for (const [key, value] of Object.entries(chainReward)) {
      // get chain info
      const rewardMap = await this.mapUserReward(value);
      try {
        // create msg and execute contract
        const txs = await this.mintRewards(rewardMap, Number(key));
        // execute contract
        if (txs.length === 0) {
          const errMsg = `Request ${listRewards
            .map((reward) => reward.requestId)
            .toString()}: 0 message`;
          this.logger.error(errMsg);
          throw new Error(errMsg);
        }
      } catch (error) {
        this.logger.error(JSON.stringify(error));
        await this.updateErrorRequest(rewardMap, error.toString());
      }
    }
  }

  async mapUserReward(listRewards: IRewardInfo[]) {
    const rewardMap = new Map<string, UserRewardInfo>();

    for (let i = 0; i < listRewards.length; i += 1) {
      try {
        const { userId, questId, campaignId, requestId, userCampaignId } =
          listRewards[i];
        const userReward = rewardMap.get(userId) ?? new UserRewardInfo(userId);

        if (campaignId) {
          const userCampaign = await this.questGraphql.getUserCampaignReward(
            campaignId
          );
          const reward = userCampaign.user_campaign_campaign.reward;
          if (reward.xp) {
            userReward.reward.xp += reward.xp;
          }

          if (reward.nft && reward.nft.ipfs !== '') {
            const nftInfo = {
              name: reward.nft.nft_name || '',
              image: reward.nft.ipfs,
              tokenId: userId + Number(new Date()).toString(),
            };
            userReward.reward.nft.push(nftInfo);
          }

          // danh dau campaign nay da co 1 luot claim
          const userCampaignRewardId =
            await this.questRewardService.saveUserCampaignReward(
              campaignId,
              userCampaign.id
            );
          userReward.userCampaignRewardIds.push(userCampaignRewardId);
          userReward.requestIds.push(requestId);
        }

        if (questId) {
          const quest = await this.questGraphql.getQuestDetail({
            id: questId,
          });

          const rewardStatus =
            await this.checkRewardService.getClaimRewardStatus(quest, userId);

          if (rewardStatus !== RewardStatus.CanClaimReward)
            throw new ForbiddenException();

          if (quest.reward?.xp) {
            userReward.reward.xp += quest.reward?.xp;
            userReward.userCampaignXp.push({
              userCampaignId,
              xp: quest.reward?.xp,
            });
          }

          if (quest.reward?.nft && quest.reward?.nft.ipfs !== '') {
            const nftInfo = {
              name: quest.reward.nft.nft_name || '',
              image: quest.reward.nft.ipfs,
              tokenId: userId + Number(new Date()).toString(),
            };
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
        }

        rewardMap.set(userId, userReward);
      } catch (error) {
        await this.questGraphql.updateRequestLogs({
          ids: listRewards[i].requestId,
          log: error.toString(),
          status: 'FAILED',
        });
        this.logger.error(error.toString());
      }
    }

    return rewardMap;
  }

  async mintRewards(rewardMap: Map<string, UserRewardInfo>, chainId: number) {
    const txsTotal = [];

    try {
      const contractWithMasterWallet =
        this.masterWalletSerivce.getLevelingContract(chainId);
      for await (const [key, value] of rewardMap.entries()) {
        const txs = [];

        // get user info by map key
        const user = await this.questGraphql.queryPublicUserWalletData({
          id: key,
          chain_id: chainId,
        });

        // calculate total xp and level
        const currentXp = user.levels[0] ? user.levels[0].xp : 0;
        const xp = value.reward.xp ?? 0;
        const totalXp = currentXp + xp;
        // calculate level from xp
        const newLevel = this.levelingService.xpToLevel(totalXp);

        const updateXpTx = await contractWithMasterWallet.updateUserInfo(
          user.active_evm_address,
          newLevel,
          totalXp
        );
        const updateXpTxResult = await updateXpTx.wait();
        txs.push(updateXpTxResult.hash);

        // update total xp to map value
        const updatedValue = { ...value };
        updatedValue.userXp = totalXp;
        updatedValue.userLevel = newLevel;
        updatedValue.chainId = chainId;
        rewardMap.set(key, updatedValue);

        // generate mint nft msg
        const rewardNFT = value.reward.nft;
        for (let i = 0; i < rewardNFT.length; i++) {
          const tx = await contractWithMasterWallet.mintReward(
            user.active_evm_address,
            rewardNFT[i].image
          );
          const txResult = await tx.wait();
          txs.push(txResult.hash);
        }

        // update offchain data
        await this.updateOffchainData(
          updatedValue,
          JSON.stringify(txs).toString()
        );

        // append to txs of all users
        txsTotal.push(...txs);
      }
    } catch (error) {
      console.log('Transaction is error', error);
      this.logger.error(error);
    }

    console.log('Transaction is mined', txsTotal);
    return txsTotal;
  }

  async updateOffchainData(value: UserRewardInfo, txHash: string) {
    const promises = [];
    const userQuestIds = [];
    const userCampaignRewardIds = [];
    const requestLogIds = [];

    // userCampaignIds: used for increase total xp of user in campaign
    const userCampaignXpIds: UserCampaignXp[] = [];

    if (value.userXp > 0) {
      promises.push(
        this.userLevelGraphql.insertUserLevel({
          user_id: value.userId,
          xp: value.userXp,
          level: value.userLevel,
          chain_id: value.chainId,
        })
      );
    }

    userCampaignXpIds.push(...value.userCampaignXp);
    userQuestIds.push(...value.userQuestIds);
    userCampaignRewardIds.push(...value.userCampaignRewardIds);
    requestLogIds.push(...value.requestIds);
    // }

    // save reward history & request status
    await Promise.all(promises);

    if (userQuestIds.length > 0)
      await this.questRewardService.updateUserQuestReward(userQuestIds, txHash);

    if (userCampaignRewardIds.length > 0)
      await this.questRewardService.updateUserCampaignReward(
        userCampaignRewardIds,
        txHash
      );

    if (requestLogIds.length > 0)
      await this.questGraphql.updateRequestLogs({
        ids: requestLogIds,
        log: txHash,
        status: 'SUCCEEDED',
      });

    await Promise.all(
      userCampaignXpIds.map((userCampaignXp) =>
        this.questGraphql.increaseUserCampaignXp({
          user_campaign_id: userCampaignXp.userCampaignId,
          reward_xp: userCampaignXp.xp,
        })
      )
    );
  }

  async updateErrorRequest(
    rewardMap: Map<string, UserRewardInfo>,
    errorDetail: string
  ) {
    for (const [, value] of rewardMap.entries()) {
      await this.questGraphql.updateRequestLogs({
        ids: value.requestIds,
        log: errorDetail,
        status: 'FAILED',
      });
    }
  }
}

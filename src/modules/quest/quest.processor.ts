import { Process, Processor } from '@nestjs/bull';
import { ForbiddenException, Logger } from '@nestjs/common';
import { QuestGraphql } from './quest.graphql';
import { CheckRewardService } from './check-reward.service';
import { RewardStatus } from '../../common/enum';
import { QuestRewardService } from './reward.service';
import { RedisService } from '../redis/redis.service';
import { IRewardInfo } from './interface/ireward-info';
import { UserCampaignXp, UserRewardInfo } from './user-reward';
import { LevelingService } from '../leveling/leveling.service';
import { MasterWalletService } from '../user-wallet/master-wallet.service';
import { UserLevelGraphql } from '../user-level/user-level.graphql';
import { ConfigService } from '@nestjs/config';

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
    // const env = this.configService.get<string>('app.env') || 'prod';
    // const redisData = await this.redisClientService.popListRedis(
    //   `punkga-${env}:reward-users`
    // );
    // if (redisData.length === 0) return true;
    // const listRewards = redisData.map(
    //   (dataStr) => JSON.parse(dataStr) as IRewardInfo
    // );
    // const rewardMap = await this.mapUserReward(listRewards);
    // // create msg and execute contract
    // const messages = await this.buildMessages(rewardMap);
    // // execute contract
    // try {
    //   if (messages.length === 0) {
    //     const errMsg = `Request ${listRewards
    //       .map((reward) => reward.requestId)
    //       .toString()}: 0 message`;
    //     this.logger.error(errMsg);
    //     throw new Error(errMsg);
    //   }
    //   const tx = await this.masterWalletSerivce.broadcastTx(messages);
    //   // update offchain db info
    //   await this.updateOffchainData(rewardMap, tx.transactionHash);
    //   this.logger.debug(`${rewardMap.size} users XP updated!!!`);
    // } catch (error) {
    //   this.logger.error(JSON.stringify(error));
    //   await this.updateErrorRequest(rewardMap, error.toString());
    // }
  }

  // async mapUserReward(listRewards: IRewardInfo[]) {
  //   const rewardMap = new Map<string, UserRewardInfo>();

  //   for (let i = 0; i < listRewards.length; i += 1) {
  //     try {
  //       const { userId, questId, campaignId, requestId, userCampaignId } =
  //         listRewards[i];
  //       const userReward = rewardMap.get(userId) ?? new UserRewardInfo(userId);

  //       if (campaignId) {
  //         const userCampaign = await this.questGraphql.getUserCampaignReward(
  //           campaignId
  //         );
  //         const reward = userCampaign.user_campaign_campaign.reward;
  //         if (reward.xp) {
  //           userReward.reward.xp += reward.xp;
  //         }

  //         if (reward.nft && reward.nft.ipfs !== '') {
  //           const nftInfo = {
  //             name: reward.nft.nft_name || '',
  //             image: reward.nft.ipfs,
  //             tokenId: userId + Number(new Date()).toString(),
  //           };
  //           userReward.reward.nft.push(nftInfo);
  //         }

  //         // danh dau campaign nay da co 1 luot claim
  //         const userCampaignRewardId =
  //           await this.questRewardService.saveUserCampaignReward(
  //             campaignId,
  //             userCampaign.id
  //           );
  //         userReward.userCampaignRewardIds.push(userCampaignRewardId);
  //         userReward.requestIds.push(requestId);
  //       }

  //       if (questId) {
  //         const quest = await this.questGraphql.getQuestDetail({
  //           id: questId,
  //         });

  //         const rewardStatus =
  //           await this.checkRewardService.getClaimRewardStatus(quest, userId);

  //         if (rewardStatus !== RewardStatus.CanClaimReward)
  //           throw new ForbiddenException();

  //         if (quest.reward?.xp) {
  //           userReward.reward.xp += quest.reward?.xp;
  //           userReward.userCampaignXp.push({
  //             userCampaignId,
  //             xp: quest.reward?.xp,
  //           });
  //         }

  //         if (quest.reward?.nft && quest.reward?.nft.ipfs !== '') {
  //           const nftInfo = {
  //             name: quest.reward.nft.nft_name || '',
  //             image: quest.reward.nft.ipfs,
  //             tokenId: userId + Number(new Date()).toString(),
  //           };
  //           userReward.reward.nft.push(nftInfo);
  //         }

  //         // danh dau quest nay da co 1 luot claim
  //         const userQuestId = await this.questRewardService.saveUserQuest(
  //           quest,
  //           userId,
  //           requestId
  //         );
  //         userReward.userQuestIds.push(userQuestId);
  //         userReward.requestIds.push(requestId);
  //       }

  //       rewardMap.set(userId, userReward);
  //     } catch (error) {
  //       await this.questGraphql.updateRequestLogs({
  //         ids: listRewards[i].requestId,
  //         log: error.toString(),
  //         status: 'FAILED',
  //       });
  //       this.logger.error(error.toString());
  //     }
  //   }

  //   return rewardMap;
  // }

  // async buildMessages(rewardMap: Map<string, UserRewardInfo>) {
  //   const messages = [];

  //   try {
  //     for (const [key, value] of rewardMap.entries()) {
  //       // get user info by map key
  //       const user = await this.questGraphql.queryPublicUserWalletData({
  //         id: key,
  //       });

  //       // calculate total xp and level
  //       const currentXp = user.levels[0] ? user.levels[0].xp : 0;
  //       const xp = value.reward.xp ?? 0;
  //       const totalXp = currentXp + xp;
  //       // calculate level from xp
  //       const newLevel = this.levelingService.xpToLevel(totalXp);

  //       // build execute contract msg increase user xp and mint nft
  //       messages.push(
  //         this.masterWalletSerivce.generateIncreaseXpMsg(
  //           user.active_wallet_address,
  //           totalXp,
  //           newLevel
  //         )
  //       );

  //       // update total xp to map value
  //       const updatedValue = { ...value };
  //       updatedValue.userXp = totalXp;
  //       updatedValue.userLevel = newLevel;
  //       rewardMap.set(key, updatedValue);

  //       // generate mint nft msg
  //       value.reward.nft.forEach((nftInfo) => {
  //         const msg = this.masterWalletSerivce.generateMintNftMsg(
  //           user.active_wallet_address,
  //           nftInfo.tokenId,
  //           {
  //             image: nftInfo.image,
  //             name: nftInfo.name || '',
  //           }
  //         );
  //         messages.push(msg);
  //       });
  //     }
  //   } catch (error) {
  //     this.logger.error(error);
  //   }

  //   return messages;
  // }

  // async updateOffchainData(
  //   rewardMap: Map<string, UserRewardInfo>,
  //   txHash: string
  // ) {
  //   const promises = [];
  //   const userQuestIds = [];
  //   const userCampaignRewardIds = [];
  //   const requestLogIds = [];

  //   // userCampaignIds: used for increase total xp of user in campaign
  //   const userCampaignXpIds: UserCampaignXp[] = [];

  //   for (const [, value] of rewardMap.entries()) {
  //     if (value.userXp > 0) {
  //       promises.push(
  //         this.userLevelGraphql.insertUserLevel({
  //           user_id: value.userId,
  //           xp: value.userXp,
  //           level: value.userLevel,
  //         })
  //       );
  //     }

  //     userCampaignXpIds.push(...value.userCampaignXp);
  //     userQuestIds.push(...value.userQuestIds);
  //     userCampaignRewardIds.push(...value.userCampaignRewardIds);
  //     requestLogIds.push(...value.requestIds);
  //   }

  //   // save reward history & request status
  //   await Promise.all(promises);

  //   if (userQuestIds.length > 0)
  //     await this.questRewardService.updateUserQuestReward(userQuestIds, txHash);

  //   if (userCampaignRewardIds.length > 0)
  //     await this.questRewardService.updateUserCampaignReward(
  //       userCampaignRewardIds,
  //       txHash
  //     );

  //   if (requestLogIds.length > 0)
  //     await this.questGraphql.updateRequestLogs({
  //       ids: requestLogIds,
  //       log: txHash,
  //       status: 'SUCCEEDED',
  //     });

  //   await Promise.all(
  //     userCampaignXpIds.map((userCampaignXp) =>
  //       this.questGraphql.increaseUserCampaignXp({
  //         user_campaign_id: userCampaignXp.userCampaignId,
  //         reward_xp: userCampaignXp.xp,
  //       })
  //     )
  //   );
  // }

  // async updateErrorRequest(
  //   rewardMap: Map<string, UserRewardInfo>,
  //   errorDetail: string
  // ) {
  //   for (const [, value] of rewardMap.entries()) {
  //     await this.questGraphql.updateRequestLogs({
  //       ids: value.requestIds,
  //       log: errorDetail,
  //       status: 'FAILED',
  //     });
  //   }
  // }
}

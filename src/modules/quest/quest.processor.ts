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
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  formatEther,
  parseEther,
} from 'ethers';
import * as fs from 'fs';
import path from 'path';

@Processor('quest')
export class QuestProcessor {
  private readonly logger = new Logger(QuestProcessor.name);
  private PROVIDER_URL = this.configService.get<string>('network.rpcEndpoint');
  // Connecting to provider
  private PROVIDER = new JsonRpcProvider(this.PROVIDER_URL);
  private contractLevelingProxy: string = this.configService.get<string>(
    'network.contractAddress.leveling'
  );
  private CONTRACT_ABI = [];
  private contractWithMasterWallet = null;

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
    if (!this.contractWithMasterWallet) {
      this.contractWithMasterWallet = await this._getContract();
      if (!this.contractWithMasterWallet) {
        const errMsg = `can not get contract With Master Wallet`;
        this.logger.error(errMsg);
        throw new Error(errMsg);
      }
    }
    const env = this.configService.get<string>('app.env') || 'prod';
    const redisData = await this.redisClientService.popListRedis(
      `punkga-${env}:reward-users`
    );
    if (redisData.length === 0) return true;
    const listRewards = redisData.map(
      (dataStr) => JSON.parse(dataStr) as IRewardInfo
    );
    const rewardMap = await this.mapUserReward(listRewards);
    try {
      // create msg and execute contract
      // const messages = await this.buildMessages(rewardMap);
      const txs = await this.mintRewards(rewardMap);
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

  async mintRewards(rewardMap: Map<string, UserRewardInfo>) {
    const txsTotal = [];

    try {
      for await (const [key, value] of rewardMap.entries()) {
        const txs = [];

        // get user info by map key
        const user = await this.questGraphql.queryPublicUserWalletData({
          id: key,
        });

        // calculate total xp and level
        const currentXp = user.levels[0] ? user.levels[0].xp : 0;
        const xp = value.reward.xp ?? 0;
        const totalXp = currentXp + xp;
        // calculate level from xp
        const newLevel = this.levelingService.xpToLevel(totalXp);

        const tx = await this.contractWithMasterWallet.updateUserInfo(
          user.active_wallet_address,
          newLevel,
          totalXp
        );
        await tx.wait();
        txs.push(tx.hash);
        txsTotal.push(tx.hash);

        // update total xp to map value
        const updatedValue = { ...value };
        updatedValue.userXp = totalXp;
        updatedValue.userLevel = newLevel;
        rewardMap.set(key, updatedValue);

        // generate mint nft msg
        const rewardNFT = value.reward.nft;
        await Promise.all(
          rewardNFT.map(async (nftInfo) => {
            const tx = await this.contractWithMasterWallet.mintReward(
              user.active_wallet_address,
              nftInfo.image
            );
            await tx.wait();
            txs.push(tx.hash);
            txsTotal.push(tx.hash);
          })
        );

        await this.updateOffchainData(value, JSON.stringify(txs).toString());
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

    // for (const [, value] of rewardMap.entries()) {
    if (value.userXp > 0) {
      promises.push(
        this.userLevelGraphql.insertUserLevel({
          user_id: value.userId,
          xp: value.userXp,
          level: value.userLevel,
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

  async _getContract() {
    const masterWalletData = await this.masterWalletSerivce.getMasterWallet();
    if (!masterWalletData) return null;

    if (this.CONTRACT_ABI.length == 0) {
      const abiFilePath = path.resolve(__dirname, './files/PunkgaReward.json');
      const files = fs.readFileSync(abiFilePath);
      this.CONTRACT_ABI = JSON.parse(files.toString()).abi;
    }

    // Connecting to smart contract
    const contract = new Contract(
      this.contractLevelingProxy,
      this.CONTRACT_ABI,
      this.PROVIDER
    );
    const rs = contract.connect(masterWalletData.wallet);
    return rs;
  }
}

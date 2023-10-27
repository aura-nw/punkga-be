import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { FilesService } from '../files/files.service';
import { QuestGraphql } from './quest.graphql';
import { UserGraphql } from '../user/user.graphql';
import { SocialActivitiesGraphql } from '../social-activites/social-activities.graphql';
import { SubscribersGraphql } from '../subscribers/subscribers.graphql';
import { UserQuestsGraphql } from '../user-quests/user-quests.graphql';
import { RepeatQuestsGraphql } from '../repeat-quests/repeat-quests.graphql';
import { ContextProvider } from '../providers/contex.provider';
import { LevelingService } from '../leveling/leveling.service';
import { UserLevelGraphql } from '../user-level/user-level.graphql';
import { MasterWalletService } from '../user-wallet/master-wallet.service';
import { UserRewardGraphql } from '../user-reward/user-reward.graphql';
import { verifyQuestCondition } from './utils';

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    private filesService: FilesService,
    private questGraphql: QuestGraphql,
    private socialActivitiesGraphql: SocialActivitiesGraphql,
    private subscribersGraphql: SubscribersGraphql,
    private userGraphql: UserGraphql,
    private userRewardGraphql: UserRewardGraphql,
    private masterWalletSerivce: MasterWalletService,
    private userQuestGraphql: UserQuestsGraphql,
    private userLevelGraphql: UserLevelGraphql,
    private levelingService: LevelingService,
    private repeatQuestGraphql: RepeatQuestsGraphql
  ) {}

  async upload(file: Express.Multer.File) {
    try {
      const url = await this.filesService.uploadImageToS3(`nft`, file);

      const ipfs = await this.filesService.uploadImageToIpfs(file);

      this.logger.debug(`uploading nft image ${file.originalname} success`);
      return {
        url,
        ipfs,
      };
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async get(questId: number, userId?: string) {
    const quest = await this.questGraphql.getQuestDetail({
      id: questId,
    });

    if (!quest) throw new NotFoundException();

    const userQuest = await this.getUserQuest(quest, userId);
    quest.reward_status = await this.getClaimRewardStatus(
      userQuest,
      quest,
      userId
    );

    return quest;
  }

  async claimReward(questId: number) {
    const { userId, token } = ContextProvider.getAuthUser();

    const quest = await this.questGraphql.getQuestDetail({
      id: questId,
    });

    const userQuest = await this.getUserQuest(quest, userId);
    const rewardStatus = await this.getClaimRewardStatus(
      userQuest,
      quest,
      userId
    );
    if (rewardStatus !== 1) throw new ForbiddenException();

    if (quest.reward?.xp) {
      // increase user xp
      return this.increaseUserXp(userId, quest, quest.reward?.xp, token);
    }

    if (quest.reward?.nft) {
      // mint nft
      return this.mintNft(userId, quest, token);
    }
  }

  async getAllCampaignQuest(userId?: string) {
    const campaigns = await this.questGraphql.getAllCampaignQuest();
    if (campaigns.length === 0) return campaigns;

    let currentLevel = 0;
    if (userId) {
      const user = await this.userGraphql.queryUserLevel({
        id: userId,
      });

      if (user?.levels[0]) {
        currentLevel = user.levels[0].level;
      }
    }

    campaigns.forEach((campaign) => {
      // let data: any;
      // data.id = campaign.id;
      campaign.campaign_quests.forEach((quest, index) => {
        campaign.campaign_quests[index].unlock = verifyQuestCondition(
          quest.condition,
          currentLevel
        );
      });
    });

    return campaigns;
  }

  private async mintNft(userId: string, quest: any, userToken: string) {
    const tokenUri = quest.reward.nft.ipfs;

    const user = await this.userGraphql.queryUserWalletData(
      {
        id: userId,
      },
      userToken
    );

    // execute contract
    const tx = await this.masterWalletSerivce.mintNft(
      user.authorizer_users_user_wallet.address,
      Number(new Date()).toString(),
      {
        image: tokenUri,
        name: quest.reward.nft.nft_name || '',
      }
    );

    const insertUserRewardResult = await this.saveRewardHistory(
      quest,
      userId,
      tx.transactionHash
    );

    this.logger.debug('Increase user xp result: ');
    this.logger.debug(JSON.stringify(insertUserRewardResult));
    return insertUserRewardResult;
  }

  private async increaseUserXp(
    userId: string,
    quest: any,
    xp: number,
    userToken: string
  ) {
    const user = await this.userGraphql.queryUserWalletData(
      {
        id: userId,
      },
      userToken
    );

    const currentXp = user.levels[0] ? user.levels[0].xp : 0;
    const totalXp = currentXp + xp;
    // calculate level from xp
    const newLevel = this.levelingService.xpToLevel(totalXp);

    // execute contract
    const tx = await this.masterWalletSerivce.updateUserLevel(
      user.authorizer_users_user_wallet.address,
      totalXp,
      newLevel
    );

    // save db
    const insertUserRewardResult = await this.saveRewardHistory(
      quest,
      userId,
      tx.transactionHash
    );

    const result = await this.userLevelGraphql.insertUserLevel(
      {
        user_id: userId,
        xp: totalXp,
        level: newLevel,
      },
      userToken
    );
    this.logger.debug('Increase user xp result: ');
    this.logger.debug(JSON.stringify(insertUserRewardResult));
    this.logger.debug(JSON.stringify(result));
    return result;
  }

  private async saveRewardHistory(quest: any, userId: string, txHash: string) {
    let quest_id, repeat_quest_id;
    if (quest.type === 'Once') {
      quest_id = quest.id;
    } else {
      // get latest repeat quest by quest id
      const repeatQuest = await this.repeatQuestGraphql.queryRepeatQuest({
        quest_id: quest.id,
      });

      if (!repeatQuest) throw new NotFoundException();
      repeat_quest_id = repeatQuest.id;
      quest_id = quest.id;
    }

    const insertUserRewardResult =
      await this.userRewardGraphql.insertUserReward({
        objects: {
          quest_id,
          repeat_quest_id,
          status: 'Claimed',
          user_id: userId,
          user_quest_rewards: {
            data: {
              tx_hash: txHash,
            },
            on_conflict: {
              constraint: 'user_quest_reward_pkey',
              update_columns: 'updated_at',
            },
          },
        },
      });
    return insertUserRewardResult;
  }

  private async getClaimRewardStatus(
    userQuest: any,
    quest: any,
    userId: string
  ) {
    let rewardStatus = 0;
    if (userId) {
      const isClaimed = await this.isClaimed(userQuest);
      if (isClaimed) {
        rewardStatus = 2;
      } else {
        const canClaimReward = await this.canClaimReward(quest, userId);

        if (canClaimReward) rewardStatus = 1;
      }
    }
    return rewardStatus;
  }

  private async getUserQuest(quest: any, userId: string) {
    let queryUserQuestCondition;
    // check reward claimed
    if (quest.type === 'Once') {
      queryUserQuestCondition = {
        where: {
          quest_id: {
            _eq: quest.id,
          },
          user_id: {
            _eq: userId,
          },
        },
      };
    } else {
      // get latest repeat quest by quest id
      const repeatQuest = await this.repeatQuestGraphql.queryRepeatQuest({
        quest_id: quest.id,
      });

      if (!repeatQuest) return false;

      queryUserQuestCondition = {
        where: {
          repeat_quest_id: {
            _eq: repeatQuest.id,
          },
          user_id: {
            _eq: userId,
          },
        },
      };
    }

    // query user quest
    const userQuest = await this.userQuestGraphql.queryUserQuests(
      queryUserQuestCondition
    );

    return userQuest;
  }

  private async isClaimed(userQuest: any): Promise<boolean> {
    if (
      userQuest?.user_quest_rewards &&
      userQuest?.user_quest_rewards !== null
    ) {
      return true;
    }
    return false;
  }

  /** Reward status
   * 0: Can not claim reward
   * 1: Can claim reward
   * 2: Claimed
   */
  private async canClaimReward(quest: any, userId: string) {
    const { requirement } = quest;

    const requirementType = Object.keys(requirement);
    if (requirementType.includes('read')) {
      // TODO: do something
    }

    if (requirementType.includes('comment')) {
      const chapterId = requirement.comment.chapter.id;
      let compareDate = new Date(new Date().setHours(0, 0, 0, 0));

      if (quest.type === 'Once') {
        compareDate = new Date(quest.created_at);
      }

      if (quest.type === 'Daily' && quest.repeat_quests?.length > 0) {
        compareDate = new Date(quest.repeat_quests[0].created_at);
      }

      const result = await this.socialActivitiesGraphql.queryActivities({
        chapter_id: chapterId,
        user_id: userId,
        created_at: compareDate,
      });

      if (result.data?.social_activities[0]) return true;
    }

    if (requirementType.includes('subscribe')) {
      // do something
      const mangaId = requirement.subscribe.manga.id;
      const result = await this.subscribersGraphql.querySubscribers({
        manga_id: mangaId,
        user_id: userId,
      });
      if (result.data.subscribers[0]) return true;
    }

    return false;
  }
}

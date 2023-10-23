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

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    private filesService: FilesService,
    private questGraphql: QuestGraphql,
    private socialActivitiesGraphql: SocialActivitiesGraphql,
    private subscribersGraphql: SubscribersGraphql,
    private userGraphql: UserGraphql,
    private masterWalletSerivce: MasterWalletService,
    private userQuestGraphql: UserQuestsGraphql,
    private userLevelGraphql: UserLevelGraphql,
    private levelingService: LevelingService,
    private repeatQuestGraphql: RepeatQuestsGraphql
  ) {}

  async upload(file: Express.Multer.File) {
    try {
      const url = await this.filesService.uploadImageToS3(`nft`, file);

      this.logger.debug(`uploading nft image ${file.originalname} success`);
      return {
        url,
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

    quest.reward_status = await this.getClaimRewardStatus(quest, userId);

    return quest;
  }

  async claimReward(questId: number) {
    const { userId, token } = ContextProvider.getAuthUser();

    const quest = await this.questGraphql.getQuestDetail({
      id: questId,
    });

    const rewardStatus = await this.getClaimRewardStatus(quest, userId);
    if (rewardStatus !== 1) throw new ForbiddenException();

    if (quest.reward?.xp) {
      // increase user xp
      return this.increaseUserXp(userId, quest.reward?.xp, token);
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
        campaign.campaign_quests[index].unlock = this.verifyQuestCondition(
          quest.condition,
          currentLevel
        );
      });
    });

    return campaigns;
  }

  private async increaseUserXp(userId: string, xp: number, userToken: string) {
    // TODO: execute contract
    // increase in db
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
    await this.masterWalletSerivce.updateUserLevel(
      user.authorizer_users_user_wallet.address,
      totalXp,
      newLevel
    );

    // save db
    const result = await this.userLevelGraphql.insertUserLevel(
      {
        user_id: userId,
        xp: totalXp,
        level: newLevel,
      },
      userToken
    );
    this.logger.debug('Increase user xp result: ');
    this.logger.debug(JSON.stringify(result));
    return result;
  }

  private async getClaimRewardStatus(quest: any, userId: string) {
    let rewardStatus = 0;
    if (userId) {
      const isClaimed = await this.isClaimed(quest, userId);
      if (isClaimed) {
        rewardStatus = 2;
      } else {
        const canClaimReward = await this.canClaimReward(
          quest.requirement,
          userId
        );

        if (canClaimReward) rewardStatus = 1;
      }
    }
    return rewardStatus;
  }

  private async isClaimed(quest: any, userId: string): Promise<boolean> {
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
  private async canClaimReward(requirement: any, userId: string) {
    const requirementType = Object.keys(requirement);

    if (requirementType.includes('read')) {
      // TODO: do something
    }

    if (requirementType.includes('comment')) {
      const chapterId = requirement.comment.chapter.id;
      const result = await this.socialActivitiesGraphql.queryActivities({
        chapter_id: chapterId,
        user_id: userId,
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

  private verifyQuestCondition(condition: any, currentLevel?: number) {
    if (condition.keys().length === 0) return true;
    const unlock: boolean[] = [];

    if (condition.level && currentLevel) {
      // check user level
      unlock.push(currentLevel >= condition.level);
    }

    const now = new Date();
    if (condition.after) {
      const after = new Date(condition.after);
      unlock.push(after < now);
    }

    if (condition.before) {
      const before = new Date(condition.before);
      unlock.push(now < before);
    }

    return unlock.includes(false) || unlock.length === 0 ? false : true;
  }
}

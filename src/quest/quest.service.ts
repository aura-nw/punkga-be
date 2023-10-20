import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { FilesService } from '../files/files.service';
import { QuestGraphql } from './quest.graphql';
import { UserGraphql } from '../user/user.graphql';
import { SocialActivitiesGraphql } from '../social-activites/social-activities.graphql';
import { SubscribersGraphql } from '../subscribers/subscribers.graphql';
import { UserQuestsGraphql } from '../user-quests/user-quests.graphql';
import { RepeatQuestsGraphql } from '../repeat-quests/repeat-quests.graphql';

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    private filesService: FilesService,
    private questGraphql: QuestGraphql,
    private socialActivitiesGraphql: SocialActivitiesGraphql,
    private subscribersGraphql: SubscribersGraphql,
    private userGraphql: UserGraphql,
    private userQuestGraphql: UserQuestsGraphql,
    private repeatQuestGraphql: RepeatQuestsGraphql
  ) {}

  async get(questId: number, userId?: string) {
    const quest = await this.questGraphql.getQuestDetail({
      id: questId,
    });

    if (!quest) throw new NotFoundException();

    let reward_status = 0;
    if (userId) {
      const isClaimed = await this.isClaimed(quest, userId);
      if (isClaimed) {
        reward_status = 2;
      } else {
        const canClaimReward = await this.canClaimReward(
          quest.requirement,
          userId
        );

        if (canClaimReward) reward_status = 1;
      }
    }
    quest.reward_status = reward_status;

    return quest;
  }

  async isClaimed(quest: any, userId: string): Promise<boolean> {
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
  async canClaimReward(requirement: any, userId: string) {
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

      if (result.data.social_activities[0]) return true;
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

  verifyQuestCondition(condition: any, currentLevel?: number) {
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
}

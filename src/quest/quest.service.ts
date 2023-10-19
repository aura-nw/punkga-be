import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { FilesService } from '../files/files.service';
import { QuestGraphql } from './quest.graphql';
import { UserGraphql } from '../user/user.graphql';

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    private filesService: FilesService,
    private questGraphql: QuestGraphql,
    private userGraphql: UserGraphql
  ) {}

  async get(questId: number, userId?: string) {
    const quest = await this.questGraphql.getQuestDetail({
      id: questId,
    });

    if (!quest) throw new NotFoundException();

    let reward_status = 0;
    if (userId) {
      reward_status = await this.checkRewardStatus(quest.requirement, userId);
    }
    quest.reward_status = reward_status;

    return quest;
  }

  /** Reward status
   * 0: Can not claim reward
   * 1: Can claim reward
   * TODO: 2: Claimed
   */
  async checkRewardStatus(requirement: any, userId: string) {
    const requirementType = Object.keys(requirement);

    if (requirementType.includes('read')) {
      // TODO: do something
    }

    if (requirementType.includes('comment')) {
      // do something
      const chapterId = requirement.comment.chapter.id;
    }

    if (requirementType.includes('subscribe')) {
      // do something
    }
    return 0;
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
    if (condition.level && currentLevel) {
      // check user level
      return currentLevel >= condition.level;
    }

    if (
      condition.duration &&
      condition.duration.after &&
      condition.duration.before
    ) {
      const now = new Date();
      const after = new Date(condition.duration.after);
      const before = new Date(condition.duration.before);
      if (after <= now && now <= before) {
        return true;
      }
    }

    return false;
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

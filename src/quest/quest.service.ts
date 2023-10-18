import { Injectable, Logger } from '@nestjs/common';

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

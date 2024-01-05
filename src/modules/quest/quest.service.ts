import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { ContextProvider } from '../../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { UserGraphql } from '../user/user.graphql';
import { QuestGraphql } from './quest.graphql';
import { CheckRewardService } from './check-reward.service';
import { CheckConditionService } from './check-condition.service';
import { QuestRewardService } from './reward.service';
import { RewardStatus } from '../../common/enum';

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    private filesService: FilesService,
    private questGraphql: QuestGraphql,
    private userGraphql: UserGraphql,
    private checkRewardService: CheckRewardService,
    private checkConditionService: CheckConditionService,
    private questRewardService: QuestRewardService
  ) { }

  async answerQuest(questId: number, answer: string) {
    const { userId, token } = ContextProvider.getAuthUser();

    const quest = await this.questGraphql.getQuestDetail({
      id: questId,
    });

    if (!quest) throw new NotFoundException();

    const activity = {
      user_id: userId,
      quest_id: questId,
      activity: {
        answer,
      },
    };

    if (quest.repeat === 'Daily' && quest.repeat_quests?.length > 0) {
      activity['repeat_quest_id'] = quest.repeat_quests[0].id;
    }

    const result = await this.questGraphql.answerQuest(
      {
        quest_activities: [activity],
      },
      token
    );

    return result;
  }

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

    quest.reward_status = await this.checkRewardService.getClaimRewardStatus(
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

    const rewardStatus = await this.checkRewardService.getClaimRewardStatus(
      quest,
      userId
    );
    if (rewardStatus !== RewardStatus.CanClaimReward)
      throw new ForbiddenException();

    const promises = [];
    if (quest.reward?.xp) {
      // increase user xp
      promises.push(this.questRewardService.increaseUserXp(
        userId,
        quest,
        quest.reward?.xp,
        token
      ));
    }

    if (quest.reward?.nft?.ipfs !== "") {
      // mint nft
      promises.push(this.questRewardService.mintNft(userId, quest, token));
    }

    const result = await Promise.all(promises);
    this.logger.debug(result)
    return result;
  }

  // async getAllCampaignQuest(userId?: string) {
  //   const campaigns = await this.questGraphql.getAllCampaignQuest();
  //   if (campaigns.length === 0) return campaigns;

  //   let user;
  //   if (userId) {
  //     user = await this.userGraphql.queryUserLevel({
  //       id: userId,
  //     });
  //   }

  //   campaigns.forEach((campaign) => {
  //     // let data: any;
  //     // data.id = campaign.id;
  //     campaign.campaign_quests.forEach((quest, index) => {
  //       campaign.campaign_quests[index].unlock =
  //         this.checkConditionService.verify(quest.condition, user);
  //     });
  //   });

  //   return campaigns;
  // }

  async deleteQuest(questId: number) {
    const { token } = ContextProvider.getAuthUser();
    const refQuest = await this.questGraphql.getRefQuest(questId, token);

    if (refQuest && refQuest.length > 0) {
      return {
        success: false,
        ref_quest: refQuest,
      };
    }

    return this.questGraphql.deleteQuest(questId, token);
  }
}

import {
  // ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { ContextProvider } from '../../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { QuestGraphql } from './quest.graphql';
import { CheckRewardService } from './check-reward.service';
// import { QuestRewardService } from './reward.service';
// import { RewardStatus } from '../../common/enum';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    private filesService: FilesService,
    private questGraphql: QuestGraphql,
    private checkRewardService: CheckRewardService,
    // private questRewardService: QuestRewardService,
    @InjectQueue('quest')
    private readonly questQueue: Queue
  ) { }

  async answerQuest(questId: number, answer: string) {
    try {
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
    } catch (errors) {
      return {
        errors,
      };
    }
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
    try {
      const quest = await this.questGraphql.getQuestDetail({
        id: questId,
      });

      if (!quest) throw new NotFoundException();

      quest.reward_status = await this.checkRewardService.getClaimRewardStatus(
        quest,
        userId
      );

      return quest;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async claimReward(questId: number) {
    try {
      const { userId, token } = ContextProvider.getAuthUser();

      await this.questQueue.add('claim', {
        userId,
        token,
        questId
      });

      // const quest = await this.questGraphql.getQuestDetail({
      //   id: questId,
      // });

      // const rewardStatus = await this.checkRewardService.getClaimRewardStatus(
      //   quest,
      //   userId
      // );
      // if (rewardStatus !== RewardStatus.CanClaimReward)
      //   throw new ForbiddenException();

      // const txs = [];
      // if (quest.reward?.xp) {
      //   // increase user xp
      //   txs.push(await this.questRewardService.increaseUserXp(
      //     userId,
      //     quest,
      //     quest.reward?.xp,
      //     token
      //   ));
      // }

      // if (quest.reward?.nft && quest.reward?.nft.ipfs !== "") {
      //   // mint nft
      //   txs.push(await this.questRewardService.mintNft(userId, quest, token));
      // }

      // // save logs
      // const insertUserRewardResult = await this.questRewardService.saveRewardHistory(
      //   quest,
      //   userId,
      //   txs
      // );

      // this.logger.debug(insertUserRewardResult)
      // return insertUserRewardResult;
      return {
        success: true,
        // ref_quest: refQuest,
      }
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async deleteQuest(questId: number) {
    try {
      const { token } = ContextProvider.getAuthUser();
      const refQuest = await this.questGraphql.getRefQuest(questId, token);

      if (refQuest && refQuest.length > 0) {
        return {
          success: false,
          ref_quest: refQuest,
        };
      }

      return this.questGraphql.deleteQuest(questId, token);
    } catch (errors) {
      return {
        errors,
      };
    }
  }
}

import { Process, Processor } from '@nestjs/bull';
import { ForbiddenException, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QuestGraphql } from './quest.graphql';
import { CheckRewardService } from './check-reward.service';
import { RewardStatus } from '../../common/enum';
import { QuestRewardService } from './reward.service';

@Processor('quest')
export class QuestProcessor {
  private readonly logger = new Logger(QuestProcessor.name);

  constructor(
    private questGraphql: QuestGraphql,
    private checkRewardService: CheckRewardService,
    private questRewardService: QuestRewardService,
  ) { }

  @Process('claim')
  async handleClaimQuest(job: Job) {
    this.logger.debug('Start claiming...');

    const { userId, token, questId, requestId } = job.data;
    try {

      const quest = await this.questGraphql.getQuestDetail({
        id: questId,
      });

      const rewardStatus = await this.checkRewardService.getClaimRewardStatus(
        quest,
        userId
      );
      if (rewardStatus !== RewardStatus.CanClaimReward)
        throw new ForbiddenException();

      const txs = [];
      if (quest.reward?.xp) {
        // increase user xp
        txs.push(await this.questRewardService.increaseUserXp(
          userId,
          quest,
          quest.reward?.xp,
          token
        ));
      }

      if (quest.reward?.nft && quest.reward?.nft.ipfs !== "") {
        // mint nft
        txs.push(await this.questRewardService.mintNft(userId, quest, token));
      }

      // save logs
      const insertUserRewardResult = await this.questRewardService.saveRewardHistory(
        quest,
        userId,
        txs
      );
      this.questGraphql.updateRequestLog({
        id: requestId,
        log: JSON.stringify(insertUserRewardResult),
        status: 'SUCCEEDED'
      })

      this.logger.debug(insertUserRewardResult)

      this.logger.debug('Claiming completed');
      return insertUserRewardResult;

    } catch (error) {

      this.questGraphql.updateRequestLog({
        id: requestId,
        log: error.toString(),
        status: 'FAILED'
      })
      this.logger.error(error.toString())
      return {
        error,
      };
    }
  }
}
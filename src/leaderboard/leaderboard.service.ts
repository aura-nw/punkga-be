import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LeaderboardGraphql } from './leaderboard.graphql';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(private questGraphql: LeaderboardGraphql) {}

  async curentRank(questId: number, userId?: string) {
    // const quest = await this.questGraphql.getQuestDetail({
    //   id: questId,
    // });
    // if (!quest) throw new NotFoundException();
    // const userQuest = await this.getUserQuest(quest, userId);
    // quest.reward_status = await this.getClaimRewardStatus(
    //   userQuest,
    //   quest,
    //   userId
    // );
    // return quest;
  }
}

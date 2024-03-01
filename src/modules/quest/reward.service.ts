import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QuestGraphql } from './quest.graphql';
import { UserRewardGraphql } from '../user-reward/user-reward.graphql';
import { UserLevelGraphql } from '../user-level/user-level.graphql';
import { LevelingService } from '../leveling/leveling.service';
import { MasterWalletService } from '../user-wallet/master-wallet.service';

@Injectable()
export class QuestRewardService {
  private readonly logger = new Logger(QuestRewardService.name);

  constructor(
    private questGraphql: QuestGraphql,
    private userRewardGraphql: UserRewardGraphql,
    private userLevelGraphql: UserLevelGraphql,
    private levelingService: LevelingService,
    private masterWalletSerivce: MasterWalletService
  ) { }

  async saveUserQuest(quest: any, userId: string, requestId: number) {
    let quest_id, repeat_quest_id;
    if (quest.repeat === 'Once') {
      quest_id = quest.id;
    } else {
      // get latest repeat quest by quest id
      const repeatQuest = await this.questGraphql.queryRepeatQuest({
        quest_id: quest.id,
      });

      if (!repeatQuest) throw new NotFoundException("repeat quest not found");
      repeat_quest_id = repeatQuest.id;
      quest_id = quest.id;
    }

    const insertUserQuestResult =
      await this.userRewardGraphql.insertUserQuest({
        objects: {
          quest_id,
          repeat_quest_id,
          status: 'Claimed',
          user_id: userId,
          user_quest_rewards: {
            data: {
              request_id: requestId
            },
            on_conflict: {
              constraint: 'user_quest_reward_pkey',
              update_columns: 'updated_at',
            },
          },
        },
      });
    return insertUserQuestResult.data.insert_user_quest.returning[0].id;
  }

  async updateUserQuestReward(userQuestIds: number[], txHash: string) {
    return this.questGraphql.updateUserQuestResult({
      user_quest_id: userQuestIds,
      tx_hash: txHash
    });
  }

}

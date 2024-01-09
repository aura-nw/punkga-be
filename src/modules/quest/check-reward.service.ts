import { Injectable } from '@nestjs/common';
import { isClaimed } from './utils';
import { CheckRequirementService } from './check-requirement.service';
import { QuestGraphql } from './quest.graphql';
import { RewardStatus } from '../../common/enum';

@Injectable()
export class CheckRewardService {
  constructor(
    private checkRequirementService: CheckRequirementService,
    private questGraphql: QuestGraphql
  ) { }

  async getClaimRewardStatus(quest: any, userId: string) {
    const userQuest = await this.questGraphql.getUserQuest(quest, userId);

    let rewardStatus = this.isOutOfSlot(quest)
      ? RewardStatus.OutOfSlot
      : RewardStatus.NotSatisfy;
    if (userId) {
      const claimed = isClaimed(userQuest);
      if (claimed) {
        rewardStatus = RewardStatus.Claimed;
      } else {
        const canClaimReward =
          await this.checkRequirementService.canClaimReward(quest, userId);

        if (canClaimReward && rewardStatus === RewardStatus.NotSatisfy)
          rewardStatus = RewardStatus.CanClaimReward;
      }
    }
    return rewardStatus;
  }

  isOutOfSlot(quest: any) {
    if (quest.reward?.slots) {
      if (quest.repeat === 'Once') {
        return quest.reward?.slots <= quest.quest_reward_claimed;
      } else {
        return (
          quest.repeat_quests &&
          quest.reward?.slots <=
          quest.repeat_quests[0]?.repeat_quest_reward_claimed
        );
      }
    }

    return false;
  }
}

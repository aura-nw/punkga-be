import { Injectable } from '@nestjs/common';
import { isClaimed } from './utils';
import { CheckRequirementService } from './check-requirement.service';

@Injectable()
export class CheckRewardService {
  constructor(private checkRequirementService: CheckRequirementService) {}

  /** Reward status
   * TODO: Use string status
   * 0: Can not claim reward
   * 1: Can claim reward
   * 2: Claimed
   * 3: Out of slot
   */
  async getClaimRewardStatus(userQuest: any, quest: any, userId: string) {
    let rewardStatus = this.isOutOfSlot(quest) ? 3 : 0;
    if (userId) {
      const claimed = isClaimed(userQuest);
      if (claimed) {
        rewardStatus = 2;
      } else {
        const canClaimReward =
          await this.checkRequirementService.canClaimReward(quest, userId);

        if (canClaimReward && rewardStatus === 0) rewardStatus = 1;
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
          quest.reward?.slots <=
          quest.repeat_quests[0]?.repeat_quest_reward_claimed
        );
      }
    }

    return false;
  }
}

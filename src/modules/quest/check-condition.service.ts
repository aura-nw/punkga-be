import { Injectable, Logger } from '@nestjs/common';
import { isClaimed } from './utils';
import { QuestGraphql } from './quest.graphql';

@Injectable()
export class CheckConditionService {

  private logger = new Logger(CheckConditionService.name)

  constructor(private questGraphql: QuestGraphql) { }

  async verify(condition: any, user: any) {
    // optional condition
    if (Object.keys(condition).length === 0) return true;

    const unlock: boolean[] = [];

    if (condition.level) {
      const currentLevel = user?.levels[0] ? user.levels[0].level : 0;
      // check user level
      unlock.push(currentLevel >= condition.level);
    }

    if (condition.quest_id) {
      // check quest condition
      const quest = await this.questGraphql.getQuestDetail({
        id: condition.quest_id,
      });
      if (!quest) {
        this.logger.error(`quest_id ${condition.quest_id} not found`);
      } else {
        const userQuest = await this.questGraphql.getUserQuest(quest, user.id);
        const isCompleted = await isClaimed(userQuest);
        unlock.push(isCompleted);
      }

    }

    return unlock.includes(false) || unlock.length === 0 ? false : true;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RepeatQuestsGraphql } from './repeat-quests.graphql';

@Injectable()
export class RepeatQuestTaskService {
  private readonly logger = new Logger(RepeatQuestTaskService.name);
  constructor(private repeatQuestsGraphql: RepeatQuestsGraphql) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async createRepeatQuests() {
    // get all repeatable quest
    const quests = await this.repeatQuestsGraphql.getRepeatableQuests();
    const insertObjects = [];
    quests.forEach((quest) => {
      if (this.inDurationCondition(quest.condition)) {
        // create repeat quest
        insertObjects.push({
          quest_id: quest.id,
        });
      }

      if (quest.condition.level) {
        insertObjects.push({
          quest_id: quest.id,
        });
      }
    });

    const result = await this.repeatQuestsGraphql.insertRepeatQuests({
      objects: insertObjects,
    });

    this.logger.debug('Insert repeat quests result:');
    this.logger.debug(JSON.stringify(result));
  }

  inDurationCondition(condition: any) {
    const inDuration = [];

    const now = new Date();
    if (condition.after) {
      const after = new Date(condition.after);
      inDuration.push(after < now);
    }

    if (condition.before) {
      const before = new Date(condition.before);
      inDuration.push(now < before);
    }

    return inDuration.includes(false) || inDuration.length === 0 ? false : true;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { RepeatQuestsGraphql } from './repeat-quests.graphql';
import { isActiveQuest } from './utils';

@Injectable()
export class RepeatQuestTaskService {
  private readonly logger = new Logger(RepeatQuestTaskService.name);
  constructor(private repeatQuestsGraphql: RepeatQuestsGraphql) { }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async createRepeatQuests() {
    // get all repeatable quest
    const quests = await this.repeatQuestsGraphql.getRepeatableQuests();
    const insertObjects = [];
    quests.forEach((quest) => {
      if (isActiveQuest(quest.condition)) {
        insertObjects.push({
          quest_id: quest.id,
        });
      }
    });

    // create repeat quest
    const result = await this.repeatQuestsGraphql.insertRepeatQuests({
      objects: insertObjects,
    });

    this.logger.debug('Insert repeat quests result:');
    this.logger.debug(JSON.stringify(result));
  }
}

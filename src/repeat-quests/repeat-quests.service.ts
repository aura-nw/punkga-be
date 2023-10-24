import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RepeatQuestsGraphql } from './repeat-quests.graphql';
import { isActiveQuest } from './utils';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RepeatQuestService {
  private readonly logger = new Logger(RepeatQuestService.name);
  constructor(
    private configService: ConfigService,
    private repeatQuestsGraphql: RepeatQuestsGraphql
  ) {}

  async create(headers, questId: number) {
    const webHookSecret = this.configService.get<string>('webhook.secret');
    if (!webHookSecret || headers['webhook-secret'] !== webHookSecret)
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    // check type
    const quest = await this.repeatQuestsGraphql.getRepeatableQuestById({
      id: questId,
    });

    if (
      quest &&
      quest.type === 'Daily' &&
      isActiveQuest(quest.condition) &&
      this.notExistRepeatQuestToday(quest.repeat_quests)
    ) {
      const result = await this.repeatQuestsGraphql.insertRepeatQuests({
        objects: [
          {
            quest_id: questId,
          },
        ],
      });
      return result;
    }
  }

  private notExistRepeatQuestToday(repeat_quests: any) {
    if (!repeat_quests || repeat_quests.length === 0) return true;

    const createdDate = new Date(repeat_quests[0].created_at);
    const todayDate = new Date();

    if (createdDate.setHours(0, 0, 0, 0) == todayDate.setHours(0, 0, 0, 0)) {
      // Date equals today's date
      return false;
    } else {
      return true;
    }
  }
}

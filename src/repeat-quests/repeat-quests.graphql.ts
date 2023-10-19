import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class RepeatQuestsGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async queryRepeatQuest(variables: any) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query repeat_quests($quest_id: Int!) {
        repeat_quests(where: {quest_id: {_eq: $quest_id}}, order_by: {created_at: desc}, limit: 1) {
          id
          quest_id
          created_at
        }
      }`,
      'repeat_quests',
      variables
    );

    return result.data.repeat_quests[0];
  }
}

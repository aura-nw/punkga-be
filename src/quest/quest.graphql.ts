import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class QuestGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async getAllCampaignQuest() {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query getAllCampaignQuest {
        campaign(where: {status: {_eq: "Published"}, campaign_quests_aggregate: {count: {predicate: {_gt: 0}, filter: {status: {_eq: "Published"}}}}}, order_by: {created_at: desc}) {
          id
          name
          campaign_quests(order_by: {created_at: desc}, where: {status: {_eq: "Published"}}) {
            id
            name
            condition
            requirement
            reward
            status
            type
            created_at
            updated_at
          }
        }
      }
      `,
      'getAllCampaignQuest',
      {}
    );

    return result.data.campaign;
  }
}

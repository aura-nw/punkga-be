import { ApiProperty } from '@nestjs/swagger';

export class GetCampaignQuestParamDto {
  @ApiProperty()
  quest_id: number;
}

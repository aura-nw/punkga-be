import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetCampaignQuestParamDto {
  @ApiProperty()
  quest_id: number;
}

export class GetCampaignQuestRequestDto {
  @ApiPropertyOptional()
  user_id: string;
}

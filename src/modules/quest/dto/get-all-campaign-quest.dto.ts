import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetAllCampaignQuestRequestDto {
  @ApiPropertyOptional()
  user_id: string;
}

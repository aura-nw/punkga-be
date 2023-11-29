import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetAllCampaignQuery {
  @ApiPropertyOptional()
  user_id: string;
}

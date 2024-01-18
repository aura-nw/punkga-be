import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class GetUserCampaignRankDto {
  @ApiProperty()
  @IsNumber()
  campaign_id: number;
}

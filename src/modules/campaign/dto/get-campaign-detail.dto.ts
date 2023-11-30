import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class GetCampaignDetailDto {
  @ApiProperty()
  @IsNumber()
  campaign_id: number;
}

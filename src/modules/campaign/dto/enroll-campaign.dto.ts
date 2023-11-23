import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class EnrollCampaignDto {
  @ApiProperty()
  @IsNumber()
  campaign_id: number;
}

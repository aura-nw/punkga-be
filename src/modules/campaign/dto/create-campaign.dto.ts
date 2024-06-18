import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CampaignLanguageDto {
  @ApiProperty()
  @IsNumber()
  language_id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;
}

export class CreateCampaignDto {
  // @ApiProperty()
  // name: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  start_date: string;

  @ApiProperty()
  end_date: string;

  @ApiProperty()
  reward: any;

  // @ApiProperty()
  // description: string;

  @ApiProperty({ type: [CampaignLanguageDto] })
  campaign_languages: CampaignLanguageDto[];
}

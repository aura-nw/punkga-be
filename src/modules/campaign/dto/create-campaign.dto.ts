import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CampaignLanguagesDto {
  @ApiProperty({ type: [CampaignLanguageDto] })
  campaign_languages: CampaignLanguageDto[];
}

export class CreateCampaignDto {
  @ApiProperty()
  status: string;

  @ApiProperty()
  start_date: string;

  @ApiProperty()
  end_date: string;

  @ApiProperty()
  reward: any;

  @ApiProperty({ type: CampaignLanguagesDto })
  i18n: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  vn_thumbnail: Express.Multer.File;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  en_thumbnail: Express.Multer.File;

  @ApiPropertyOptional({ type: ['string'], format: 'binary' })
  files: Express.Multer.File[];
}

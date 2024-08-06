import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class BannerTargetDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  value: string;
}

export class BannerLanguageDto {
  @ApiProperty()
  @IsNumber()
  language_id: number;

  @ApiProperty()
  image_url: string;
}

export class BannerLanguagesDto {
  @ApiProperty({ type: [BannerLanguageDto] })
  banner_languages: BannerLanguageDto[];
}

export class UpdateBannerDto {
  @ApiProperty()
  status: string;

  @ApiProperty()
  order: number;

  @ApiProperty({ type: BannerTargetDto })
  target: string;

  @ApiProperty({ type: BannerLanguagesDto })
  i18n: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  vn_image: Express.Multer.File;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  en_image: Express.Multer.File;

  @ApiPropertyOptional({ type: ['string'], format: 'binary' })
  files: Express.Multer.File[];
}

export class UpdateBannerParam {
  @ApiProperty()
  banner_id: number;
}

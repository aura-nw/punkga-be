import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BannerTargetDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  value: string;
}

export class CreateBannerDto {
  @ApiProperty({ type: BannerTargetDto })
  target: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  en_image: Express.Multer.File;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  vn_image: Express.Multer.File;

  @ApiPropertyOptional({ type: ['string'], format: 'binary' })
  files: Express.Multer.File[];
}

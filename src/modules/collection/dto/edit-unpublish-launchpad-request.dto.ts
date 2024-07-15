import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EditUnPublishLaunchpadParamDto {
  @ApiProperty()
  id: number;
}

export class EditUnPublishLaunchpadRequestDto {
  @ApiProperty()
  description: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  thumbnail: Express.Multer.File;

  @ApiPropertyOptional({ type: ['string'], format: 'binary' })
  featured_images: Express.Multer.File[];

  @ApiProperty()
  thumbnail_url: string;

  @ApiProperty({ type: [String] })
  featured_images_url: string;
}

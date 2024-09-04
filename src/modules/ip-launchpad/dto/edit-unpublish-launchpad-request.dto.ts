import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EditUnPublishIpLaunchpadParamDto {
  @ApiProperty()
  id: number;
}

export class EditUnPublishIpLaunchpadRequestDto {
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

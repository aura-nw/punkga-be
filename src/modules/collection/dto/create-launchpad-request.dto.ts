import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLaunchpadRequestDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  name_in_vn: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  description_in_vn: string;

  @ApiProperty()
  seo_description: string;

  @ApiProperty()
  seo_description_in_vn: string;
  
  @ApiProperty({ type: 'string', format: 'binary' })
  thumbnail: Express.Multer.File;
  
  @ApiProperty({ type: 'string', format: 'binary' })
  thumbnail_in_vn: Express.Multer.File;
  
  // @ApiProperty({ type: 'string', format: 'binary' })
  // logo: Express.Multer.File;
  
  @ApiProperty({ type: ['string'], format: 'binary' })
  featured_images: Express.Multer.File[];
  
  @ApiProperty()
  creator_id: number;

  @ApiProperty()
  contract_address: string;

}

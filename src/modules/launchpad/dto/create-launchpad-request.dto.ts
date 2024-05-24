import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLaunchpadRequestDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  license_token_id: string;

  @ApiProperty()
  license_token_address: string;

  @ApiProperty()
  mint_price: string;

  @ApiPropertyOptional()
  royalties: string;

  @ApiProperty()
  max_supply: string;

  @ApiProperty()
  max_mint_per_address: string;

  @ApiProperty()
  start_date: string;

  @ApiProperty()
  end_date: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  thumbnail: Express.Multer.File;

  // @ApiPropertyOptional({ type: 'string', format: 'binary' })
  // logo: Express.Multer.File;

  @ApiProperty({ type: ['string'], format: 'binary' })
  featured_images: Express.Multer.File[];

  @ApiProperty({ type: ['string'], format: 'binary' })
  nft_images: Express.Multer.File[];

  @ApiPropertyOptional()
  creator_address: string;
}

import { ApiProperty } from '@nestjs/swagger';

export class CreateAlbumRequestDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  thumbnail: Express.Multer.File;

  @ApiProperty()
  show: boolean;

  @ApiProperty({ type: ['string'], format: 'binary' })
  artworks: Express.Multer.File[];
}

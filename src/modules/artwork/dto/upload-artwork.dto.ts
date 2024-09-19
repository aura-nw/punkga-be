import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadArtworkDto {
  @ApiPropertyOptional()
  album_id: number;

  @ApiProperty({ type: ['string'], format: 'binary' })
  artworks: Express.Multer.File[];
}

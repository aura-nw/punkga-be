import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAlbumParamDto {
  @ApiProperty()
  id: number;
}

export class UpdateAlbumRequestDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  thumbnail: Express.Multer.File;

  @ApiProperty()
  show: boolean;
}

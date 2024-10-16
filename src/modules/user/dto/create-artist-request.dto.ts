import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArtistRequestDto {
  @ApiProperty()
  pen_name: string;

  @ApiProperty()
  bio: string;

  @ApiPropertyOptional()
  avatar_url: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  avatar: Express.Multer.File;
}

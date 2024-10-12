import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitCharacterRequestDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  avatar: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary' })
  description: Express.Multer.File;
}

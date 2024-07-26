import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadNftImageRequestDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
}

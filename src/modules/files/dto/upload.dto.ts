import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UploadImageS3Dto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
}

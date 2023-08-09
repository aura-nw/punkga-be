import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UploadInputDto {
  @ApiProperty({ type: 'number' })
  @IsString()
  name: string;

  @ApiProperty()
  currentChunkIndex: string;

  @ApiProperty()
  totalChunks: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
}

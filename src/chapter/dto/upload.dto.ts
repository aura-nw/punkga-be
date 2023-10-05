import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class UploadInputDto {
  @ApiProperty({ type: 'number' })
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  currentChunkIndex: number;

  @ApiProperty()
  @IsNumber()
  totalChunks: number;

  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
}

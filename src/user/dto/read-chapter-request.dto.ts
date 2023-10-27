import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class ReadChapterRequestDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  chapter_id: number;
}

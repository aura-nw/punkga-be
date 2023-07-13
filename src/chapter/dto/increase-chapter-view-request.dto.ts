import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class IncreaseChapterViewParamDto {
  @ApiProperty()
  @IsNumber()
  chapterId: number;
}

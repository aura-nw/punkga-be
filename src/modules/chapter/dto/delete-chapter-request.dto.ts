import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class DeleteChapterParamDto {
  @ApiProperty()
  @IsNumber()
  chapterId: number;
}

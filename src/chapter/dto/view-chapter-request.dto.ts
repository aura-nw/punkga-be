import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class ViewProtectedChapterRequestDto {
  @ApiProperty()
  @IsNumber()
  chapterId: number;
}

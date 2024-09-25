import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class DeleteMangaParam {
  @ApiProperty()
  @IsNumber()
  manga_id: number;
}

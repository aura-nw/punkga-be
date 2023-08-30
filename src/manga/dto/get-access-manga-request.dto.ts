import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class GetAccessMangaParamDto {
  @ApiProperty()
  @IsNumber()
  mangaId: number;
}

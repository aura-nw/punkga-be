import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class MangaCollection {
  @ApiProperty({ type: [Number], example: [1] })
  collectionIds: number[];
}

export class MangaCollectionParamDto {
  @ApiProperty()
  @IsNumber()
  mangaId: number;
}

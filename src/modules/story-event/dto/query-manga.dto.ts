import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryMangaParamDto {
  @ApiPropertyOptional()
  limit: number;

  @ApiPropertyOptional()
  offset: number;
}

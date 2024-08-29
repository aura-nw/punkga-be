import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAlbumDto {
  @ApiPropertyOptional()
  limit: string;

  @ApiPropertyOptional()
  offset: string;
}

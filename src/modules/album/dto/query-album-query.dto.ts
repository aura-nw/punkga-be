import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAlbumDto {
  @ApiPropertyOptional()
  name: string;

  @ApiPropertyOptional()
  limit: string;

  @ApiPropertyOptional()
  offset: string;
}

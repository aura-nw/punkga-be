import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAlbumPublicDto {
  @ApiPropertyOptional()
  creator_id: number;

  @ApiPropertyOptional()
  limit: string;

  @ApiPropertyOptional()
  offset: string;
}

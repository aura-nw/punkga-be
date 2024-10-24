import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryArtworkParamDto {
  @ApiPropertyOptional()
  limit: number;

  @ApiPropertyOptional()
  offset: number;
}

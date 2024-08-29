import { ApiProperty } from '@nestjs/swagger';

export class DeleteArtworksDto {
  @ApiProperty({ type: [String] })
  ids: number[];
}

import { ApiProperty } from '@nestjs/swagger';

export class UnLikeArtworkParamDto {
  @ApiProperty()
  artwork_id: number;
}

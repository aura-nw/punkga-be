import { ApiProperty } from '@nestjs/swagger';

export class LikeArtworkParamDto {
  @ApiProperty()
  artwork_id: number;
}

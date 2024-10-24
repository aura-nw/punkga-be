import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MintNFTAndRegisterDerivative {
  @ApiProperty({ type: [Number], example: [5, 6, 7] })
  storyArtworkIPIds: number[];

  @ApiProperty({ example: 4 })
  storyCollectionId: number;
}

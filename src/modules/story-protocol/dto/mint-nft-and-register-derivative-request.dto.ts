import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MintNFTAndRegisterDerivative {
  @ApiProperty({ type: [Number], example: [5, 6, 7] })
  id: number[];
}

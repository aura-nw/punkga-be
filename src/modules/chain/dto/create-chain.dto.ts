import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChainDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  rpc: string;

  @ApiProperty()
  chain_id: string;

  @ApiProperty()
  address_type: string;
}

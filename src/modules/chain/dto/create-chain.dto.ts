import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Contracts {
  @ApiProperty({ example: '0xFfABBAC4b8860268317d787A181aD4D7F8E93D00' })
  leveling_contract: string;
}

export class PunkgaConfigs {
  @ApiProperty({ example: 'XP' })
  reward_point_name: string;
}

export class CreateChainDto {
  @ApiProperty({ example: 'Aura Euphoria' })
  name: string;

  @ApiProperty({ example: 'https://jsonrpc.euphoria.aura.network' })
  rpc: string;

  @ApiProperty({ example: 6321 })
  chain_id: string;

  @ApiProperty({ example: 'evm' })
  address_type: string;

  @ApiProperty({ type: Contracts })
  contracts: Contracts;

  @ApiProperty({ type: PunkgaConfigs })
  punkga_config: PunkgaConfigs;
}

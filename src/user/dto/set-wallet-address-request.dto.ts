import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SetWalletAddressDto {
  @ApiProperty({ example: 'aura1hctj3tpmucmuv02umf9252enjedkce7mml69k8' })
  @IsString()
  wallet_address: string;
}

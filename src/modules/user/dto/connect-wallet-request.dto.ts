import { ApiProperty } from '@nestjs/swagger';

export class ConnectWalletRequestDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  signature: string;
}

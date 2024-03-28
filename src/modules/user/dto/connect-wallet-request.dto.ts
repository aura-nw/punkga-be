import { ApiProperty } from '@nestjs/swagger';

export class ConnectWalletRequest {
  @ApiProperty()
  address: string;
}

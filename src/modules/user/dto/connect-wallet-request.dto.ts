import { StdSignDoc, StdSignature } from '@cosmjs/amino';
import { ApiProperty } from '@nestjs/swagger';

export class ConnectWalletRequest {
  @ApiProperty()
  signedDoc: StdSignDoc;

  @ApiProperty()
  signature: StdSignature;
}

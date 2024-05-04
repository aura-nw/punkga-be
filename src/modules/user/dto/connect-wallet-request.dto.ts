// import { AminoMsg as IAminoMsg, StdFee as IStdFee, Coin as ICoin, StdSignature as IStdSignature, Pubkey as IPubkey, StdSignDoc, StdSignature } from '@cosmjs/amino';
import { ApiProperty } from '@nestjs/swagger';

export class ConnectWalletRequestDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  signature: string;
}

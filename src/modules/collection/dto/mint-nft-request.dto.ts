import { ApiProperty } from "@nestjs/swagger";

export class MintRequestDtoParam {
  @ApiProperty()
  launchpad_id: number;

  @ApiProperty()
  nft_amount: number;
}
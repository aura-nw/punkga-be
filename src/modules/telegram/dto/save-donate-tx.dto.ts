import { ApiProperty } from '@nestjs/swagger';

export class SaveDonateTxDto {
  @ApiProperty()
  creator_id: number;

  @ApiProperty()
  txn: string;

  @ApiProperty()
  value: number;
}

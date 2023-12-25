import { ApiProperty } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  start_date: string;

  @ApiProperty()
  end_date: string;

  @ApiProperty()
  reward: any;

  @ApiProperty()
  description: string;
}

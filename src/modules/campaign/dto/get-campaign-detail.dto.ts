import { ApiProperty } from '@nestjs/swagger';

export class GetCampaignDetailDto {
  @ApiProperty()
  campaign_slug: string;
}

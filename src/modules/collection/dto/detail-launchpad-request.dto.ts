import { ApiProperty } from '@nestjs/swagger';

export class DetailLaunchpadRequestDtoParam {
  @ApiProperty()
  launchpad_id: number;
}

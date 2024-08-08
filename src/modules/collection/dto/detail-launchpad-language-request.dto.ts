import { ApiProperty } from '@nestjs/swagger';

export class DetailLaunchpadLanguageRequestDtoParam {
  @ApiProperty()
  launchpad_id: number;

  @ApiProperty()
  language_id: number;
}

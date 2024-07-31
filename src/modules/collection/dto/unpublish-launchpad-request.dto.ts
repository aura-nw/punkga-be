import { ApiProperty } from "@nestjs/swagger";

export class UnPublishLaunchpadRequestDtoParam {
  @ApiProperty()
  id: number;
}
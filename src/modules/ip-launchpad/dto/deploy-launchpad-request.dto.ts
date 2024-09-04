import { ApiProperty } from '@nestjs/swagger';

export class DeployIpLaunchpadRequestDtoParam {
  @ApiProperty()
  id: number;
}

export class DeployIpLaunchpadRequestDtoBody {
  @ApiProperty()
  tx_hash: string;
}

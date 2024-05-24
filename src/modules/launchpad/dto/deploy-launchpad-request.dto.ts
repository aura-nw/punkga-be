import { ApiProperty } from '@nestjs/swagger';

export class DeployLaunchpadRequestDtoParam {
  @ApiProperty()
  id: number;
}

export class DeployLaunchpadRequestDtoBody {
  @ApiProperty()
  tx_hash: string;
}

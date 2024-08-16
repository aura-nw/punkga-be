import { ApiProperty } from '@nestjs/swagger';

export class UpdateArtworkParamDto {
  @ApiProperty()
  id: number;
}

export class UpdateArtworkDto {
  @ApiProperty()
  name: string;
}

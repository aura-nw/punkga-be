import { ApiProperty } from '@nestjs/swagger';

export class DetailAlbumParamDto {
  @ApiProperty()
  id: number;
}

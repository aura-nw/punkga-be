import { ApiProperty } from '@nestjs/swagger';

export class DeleteAlbumParamDto {
  @ApiProperty()
  id: number;
}

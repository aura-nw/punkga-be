import { ApiProperty } from '@nestjs/swagger';

export class LinkUserDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;
}

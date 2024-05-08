import { ApiProperty } from '@nestjs/swagger';

export class CreateCreatorRequestDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  bio: string;

  @ApiProperty()
  socials: string;

  @ApiProperty()
  pen_name: string;

  @ApiProperty()
  gender: string;

  @ApiProperty()
  dob: string;

  @ApiProperty()
  wallet_address: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  avatar: Express.Multer.File;
}

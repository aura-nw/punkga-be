import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class UpdateCreatorRequestDto {
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

  @ApiProperty({ type: 'string', format: 'binary' })
  avatar: Express.Multer.File;
}

export class UpdateCreatorParamDto {
  @ApiProperty()
  @IsNumber()
  creatorId: number;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class UpdateCreatorRequestDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  @Transform(({ value }) =>
    value.split('\\n').join('\n').split('\\t').join('\t')
  )
  bio: string;

  @ApiProperty()
  socials: string;

  @ApiProperty()
  pen_name: string;

  @ApiProperty()
  gender: string;

  @ApiPropertyOptional()
  dob: string;

  @ApiPropertyOptional()
  wallet_address: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  avatar: Express.Multer.File;
}

export class UpdateCreatorParamDto {
  @ApiProperty()
  @IsNumber()
  creatorId: number;
}

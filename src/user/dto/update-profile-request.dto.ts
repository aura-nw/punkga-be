import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Gender } from '../../common/enum';

export class UpdateProfileRequestDto {
  @ApiPropertyOptional({ example: '2020-07-05' })
  @IsString()
  birthdate: string;

  @ApiProperty({ enum: Gender, enumName: 'Gender' })
  gender: Gender;

  @ApiProperty({ example: '' })
  bio: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  picture: Express.Multer.File;
}

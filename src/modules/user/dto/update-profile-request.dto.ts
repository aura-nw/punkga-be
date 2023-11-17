import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '../../../common/enum';

export class UpdateProfileRequestDto {
  @ApiPropertyOptional({ example: '2020-07-05' })
  birthdate: string;

  @ApiPropertyOptional({ enum: Gender, enumName: 'Gender' })
  gender: Gender;

  @ApiPropertyOptional({ example: '' })
  bio: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  picture: Express.Multer.File;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsAlphanumeric,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCollection {

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  logo: Express.Multer.File;
}

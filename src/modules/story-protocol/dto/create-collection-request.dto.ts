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
  symbol: string;
}

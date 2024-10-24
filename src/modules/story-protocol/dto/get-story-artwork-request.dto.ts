import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsAlphanumeric,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class GetStoryArtworkQueryDto {

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  offset: number;
}

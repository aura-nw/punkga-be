import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsAlphanumeric,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { MangaStatus } from '../../../common/enum';

export class GetMangaCreatorQueryDto {
  @ApiPropertyOptional({ enum: MangaStatus, example: MangaStatus.OnRequest })
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsAlphanumeric()
  keyword: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  offset: number;
}

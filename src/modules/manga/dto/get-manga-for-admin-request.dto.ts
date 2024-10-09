import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsAlphanumeric,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { MangaStatus } from '../../../common/enum';

export class GetMangaAdminQueryDto {
  @ApiPropertyOptional({
    type: [MangaStatus],
    example: [MangaStatus.OnRequest, MangaStatus.Published],
  })
  status: string[];

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

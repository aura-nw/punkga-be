import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsAlphanumeric, IsNumber, IsOptional, IsString } from 'class-validator';

export class GetMangaCreatorQueryDto {
  @IsOptional()
  @IsAlphanumeric()
  keyword: string;

  @IsOptional()
  @IsNumber()
  limit: number;

  @IsOptional()
  @IsNumber()
  offset: number;
}

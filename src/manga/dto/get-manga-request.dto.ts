import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetMangaQueryDto {
  @ApiPropertyOptional()
  user_id: string;
}

export class GetMangaParamDto {
  @ApiProperty()
  @IsString()
  slug: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetChapterByMangaQueryDto {
  @ApiPropertyOptional()
  user_id: string;
}

export class GetChapterByMangaParamDto {
  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty()
  @IsString()
  chapter_number: string;
}

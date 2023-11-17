import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber } from 'class-validator';
import { MangaStatus } from '../../../common/enum';

export class MangaTag {
  @ApiProperty()
  @IsNumber()
  tag_id: number;
}

export class MangaCreator {
  @ApiProperty()
  @IsNumber()
  creator_id: number;
}

export class MangaLanguage {
  @ApiProperty()
  title: string;

  @ApiProperty()
  @IsNumber()
  language_id: number;

  @ApiProperty()
  @IsBoolean()
  is_main_language: number;

  @ApiProperty()
  description: string;
}

export class UpdateMangaRequestDto {
  @ApiProperty({ enum: MangaStatus, enumName: 'MangaStatus' })
  status: MangaStatus;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  banner: Express.Multer.File;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  poster: Express.Multer.File;

  @ApiProperty()
  release_date: string;

  @ApiProperty()
  contract_addresses: string;

  @ApiProperty({ type: [MangaTag] })
  manga_tags: string;

  @ApiProperty({ type: MangaCreator, isArray: true })
  manga_creators: string;

  @ApiProperty({ type: [MangaLanguage] })
  manga_languages: string;
}

export class UpdateMangaParamDto {
  @ApiProperty()
  @IsNumber()
  mangaId: number;
}

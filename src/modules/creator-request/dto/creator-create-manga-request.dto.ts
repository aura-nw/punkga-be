import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString } from 'class-validator';
import { MangaStatus } from '../../../common/enum';

class MangaTag {
  @ApiProperty()
  @IsNumber()
  tag_id: number;
}

class MangaCreator {
  @ApiProperty()
  @IsNumber()
  creator_id: number;
}

class MangaLanguage {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNumber()
  language_id: number;

  @ApiProperty()
  @IsBoolean()
  is_main_language: boolean;

  @ApiProperty()
  @IsString()
  description: string;
}

export class CreatorCreateMangaRequestDto {
  @ApiProperty({ type: Number })
  requestor_id: number;

  @ApiProperty({ type: [MangaTag] })
  manga_tags: string;

  @ApiProperty({ type: [MangaCreator] })
  manga_creators: string;

  @ApiProperty({ type: [MangaLanguage] })
  manga_languages: string;

  // @ApiProperty({ example: '2023-07-05T02:48:36.893251+00:00' })
  // release_date: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  banner: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary' })
  poster: Express.Multer.File;

  @ApiProperty({ type: Number, enum: [0, 1], example: 0 })
  finished: number;

  @ApiProperty({ type: Number, enum: [0, 1], example: 0 })
  age_limit: number;
}

export class CreatorUpdateMangaRequestDto {
  @ApiProperty({ type: Number })
  requestor_id: number;

  @ApiProperty({ type: [MangaTag] })
  manga_tags: string;

  @ApiProperty({ type: [MangaCreator] })
  manga_creators: string;

  @ApiProperty({ type: [MangaLanguage] })
  manga_languages: string;

  // @ApiProperty({ example: '2023-07-05T02:48:36.893251+00:00' })
  // release_date: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  banner: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary' })
  poster: Express.Multer.File;
  
  @ApiProperty({ type: Number, enum: [0, 1], example: 0 })
  finished: number;

  @ApiProperty({ type: Number, enum: [0, 1], example: 0 })
  age_limit: number;
}

export class CreatorUpdateMangaParamDto {
  @ApiProperty()
  @IsNumber()
  mangaId: number;
}

export class CreatorUpdateRequestParamDto {
  @ApiProperty()
  @IsNumber()
  request_id: number;
}

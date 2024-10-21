import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class MangaTag {
  @ApiProperty()
  @IsNumber()
  tag_id: number;
}

export class MangaStoryCharacter {
  @ApiProperty()
  @IsNumber()
  story_character_id: number;
}

export class MangaLanguage {
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

  @ApiProperty()
  @IsString()
  image_url: string;
}

export class SubmitMangaRequestDto {
  @ApiProperty()
  cover_url: string;

  @ApiProperty()
  banner_url: string;

  // @ApiProperty({ type: [MangaTag] })
  // manga_tags: string;

  @ApiProperty({ type: [MangaLanguage] })
  manga_languages: string;

  @ApiProperty({ type: [MangaStoryCharacter] })
  manga_characters: string;
}

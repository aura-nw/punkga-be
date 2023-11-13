import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString } from 'class-validator';
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

export class CreateMangaRequestDto {
  @ApiProperty({ enum: MangaStatus, enumName: 'MangaStatus' })
  status: MangaStatus;

  @ApiProperty({ type: [MangaTag] })
  manga_tags: string;

  @ApiProperty({ type: [MangaCreator] })
  manga_creators: string;

  @ApiProperty({ type: [MangaLanguage] })
  manga_languages: string;

  @ApiProperty()
  release_date: string;

  @ApiProperty()
  contract_addresses: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  banner: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary' })
  poster: Express.Multer.File;

  // @ApiProperty({ type: ['string'], format: 'binary' })
  // files: Express.Multer.File[];
}

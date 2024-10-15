import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { ChapterStatus, ChapterType } from '../../../common/enum';

export class ChapterLanguage {
  @ApiProperty()
  @IsNumber()
  language_id: number;

  @ApiProperty({ example: 'BC - 1.zip' })
  @IsString()
  file_name: string;
}
export class ChapterImage {
  @ApiProperty({ type: [ChapterLanguage] })
  chapter_languages: ChapterLanguage[];
}

export class CreateChapterRequestDto {
  @ApiProperty()
  @IsNumber()
  manga_id: number;

  @ApiProperty()
  @IsString()
  chapter_name: string;

  @ApiProperty()
  @IsNumber()
  chapter_number: number;

  @ApiProperty({ enum: ChapterType, enumName: 'ChapterType' })
  chapter_type: ChapterType;

  @ApiProperty({ type: ChapterImage })
  chapter_images: string;

  @ApiProperty({ example: '2023-07-05T02:48:36.893251+00:00' })
  @IsString()
  pushlish_date: string;

  @ApiProperty({ enum: ChapterStatus, enumName: 'ChapterStatus' })
  status: ChapterStatus;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  thumbnail: Express.Multer.File;

  @ApiPropertyOptional({ type: ['string'], format: 'binary' })
  files: Express.Multer.File[];

  @ApiPropertyOptional({ type: [Number], example: [1] })
  collection_ids: number[];

  @ApiPropertyOptional()
  submission_id?: number;
}

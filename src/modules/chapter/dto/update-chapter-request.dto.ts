import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { ChapterStatus, ChapterType } from '../../../common/enum';
import { ChapterLanguage } from './create-chapter-request.dto';

export class UpdateChapterLanguage extends ChapterLanguage {
  @ApiProperty({ type: ['string'] })
  add_images: string[];

  @ApiProperty({ type: ['string'] })
  delete_images: string[];
}
export class UpdateChapterImage {
  @ApiProperty({ type: [UpdateChapterLanguage] })
  chapter_languages: UpdateChapterLanguage[];
}

export class UpdateChapterRequestDto {
  @ApiProperty()
  @IsString()
  chapter_name: string;

  @ApiProperty()
  @IsNumber()
  chapter_number: number;

  @ApiProperty({ enum: ChapterType, enumName: 'ChapterType' })
  chapter_type: ChapterType;

  @ApiProperty({ type: UpdateChapterImage })
  chapter_images: string;

  @ApiProperty({ example: '2023-07-05T02:48:36.893251+00:00' })
  @IsString()
  pushlish_date: string;

  @ApiProperty({ enum: ChapterStatus, enumName: 'ChapterStatus' })
  status: ChapterStatus;

  @ApiProperty({ type: 'string', format: 'binary' })
  thumbnail: Express.Multer.File;

  @ApiProperty({ type: ['string'], format: 'binary' })
  files: Express.Multer.File[];

  @ApiPropertyOptional({ type: [Number], example: [1] })
  collection_ids: number[];
}

export class UpdateChapterParamDto {
  @ApiProperty()
  @IsNumber()
  chapterId: number;
}

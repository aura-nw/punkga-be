import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

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

  @ApiProperty()
  @IsString()
  chapter_type: string;

  @ApiProperty()
  @IsString()
  chapter_images: string;

  @ApiProperty()
  @IsString()
  pushlish_date: string;

  @ApiProperty()
  @IsString()
  status: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  thumbnail: Express.Multer.File;

  @ApiProperty({ type: ['string'], format: 'binary' })
  files: Express.Multer.File[];
}

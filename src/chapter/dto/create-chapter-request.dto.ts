import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CreateChapterRequestDto {
  @ApiProperty({ required: true })
  @IsNumber()
  manga_id: number;

  @ApiProperty({ required: true })
  @IsString()
  chapter_name: string;

  @ApiProperty({ required: true })
  @IsNumber()
  chapter_number: number;

  @ApiProperty({ required: true })
  @IsString()
  chapter_type: string;

  @ApiProperty({ required: true })
  @IsString()
  chapter_images: string;

  @ApiProperty({ required: true })
  @IsString()
  pushlish_date: string;

  @ApiProperty({ required: true })
  @IsString()
  status: string;

  @ApiProperty({ type: ['string'], format: 'binary', required: true })
  files: Express.Multer.File[];
}

import { ApiProperty } from '@nestjs/swagger';

export class ReadChapterDto {
  @ApiProperty()
  manga_slug: string;

  @ApiProperty()
  chapter_number: number;
}

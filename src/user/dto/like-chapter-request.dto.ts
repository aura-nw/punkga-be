import { ApiProperty } from '@nestjs/swagger';

export class LikeChapterParam {
  @ApiProperty()
  chapterId: number;
}

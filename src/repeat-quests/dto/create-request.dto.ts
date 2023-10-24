import { ApiProperty } from '@nestjs/swagger';

export class CreateRepeatQuestRequestDto {
  @ApiProperty()
  quest_id: number;
}

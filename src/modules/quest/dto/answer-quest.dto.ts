import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnswerQuestParamDto {
  @ApiProperty()
  quest_id: number;
}

export class AnswerQuestRequestDto {
  @ApiPropertyOptional()
  answer: string;
}

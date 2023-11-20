import { ApiProperty } from '@nestjs/swagger';

export class DeleteQuestParamDto {
  @ApiProperty()
  quest_id: number;
}

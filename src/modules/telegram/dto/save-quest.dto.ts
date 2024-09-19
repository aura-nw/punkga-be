import { ApiProperty } from '@nestjs/swagger';

export class SaveQuestDto {
  @ApiProperty()
  id: number;
}

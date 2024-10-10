import { ApiProperty } from '@nestjs/swagger';
import { StoryCharacterStatus } from '../story-event.enum';

export class UpdateCharacterStatusRequestDto {
  @ApiProperty()
  ids: number[];

  @ApiProperty({
    enum: [StoryCharacterStatus.Approved, StoryCharacterStatus.Rejected],
  })
  status: StoryCharacterStatus;
}

import { ApiProperty } from '@nestjs/swagger';
import { StoryCharacterStatus } from '../story-event.enum';

export class UpdateCharacterStatusRequestDto {
  // @ApiProperty({ type: [Number], example: [1] })
  @ApiProperty({ type: [Number] })
  ids: string;

  @ApiProperty({
    enum: [StoryCharacterStatus.Approved, StoryCharacterStatus.Rejected],
  })
  status: StoryCharacterStatus;
}

import { ApiProperty } from '@nestjs/swagger';
import { StoryArtworkStatus, StoryCharacterStatus } from '../story-event.enum';

export class UpdateStoryArtworkStatusRequestDto {
  // @ApiProperty({ type: [Number], example: [1] })
  @ApiProperty({ type: [Number] })
  ids: string;

  @ApiProperty({
    enum: [StoryArtworkStatus.Approved, StoryArtworkStatus.Rejected],
  })
  status: StoryArtworkStatus;
}

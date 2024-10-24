import { ApiProperty } from '@nestjs/swagger';
// import { SubmissionStatus } from '../story-event.enum';

export class RejectMangaSubmissionRequestDto {
  @ApiProperty({ type: [Number] })
  ids: string;

  // @ApiProperty({
  //   enum: [SubmissionStatus.Rejected],
  // })
  // status: SubmissionStatus;
}

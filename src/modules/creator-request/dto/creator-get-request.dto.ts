import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString } from 'class-validator';
import { CreatorRequestStatus } from '../../../common/enum';

export class GetRequestByCreatorAndStatusParam {
  @ApiProperty({ example: 1 })
  @IsNumber()
  creator_id: number;
}
export class GetRequestByCreatorAndStatusRequest {
  @ApiProperty({
    enum: CreatorRequestStatus,
    enumName: 'CreatorRequestStatus',
    example: 'Submitted',
  })
  @IsString()
  status: string;
}

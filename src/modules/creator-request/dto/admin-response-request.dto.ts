import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString } from 'class-validator';
import { AdminResponse } from '../../../common/enum';

export class AdminResponseRequest {
  @ApiProperty({ example: 1 })
  @IsNumber()
  request_id: number;

  @ApiProperty({
    enum: AdminResponse,
    example: 'Rejected',
  })
  @IsString()
  adminResponse: string;

  @ApiPropertyOptional({
    example: 'N/A',
  })
  adminNote: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class GetRequestDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  request_id: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class GetIPStoryCollectionQueryDto {
  @ApiProperty()
  @IsNumber()
  id: number;
}

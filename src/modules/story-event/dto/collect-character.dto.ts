import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class CollectCharacterParamDto {
  @ApiProperty()
  @IsNumber()
  id: number;
}

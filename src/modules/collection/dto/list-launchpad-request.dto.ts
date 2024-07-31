import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListLaunchpadRequestDtoParam {
  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 0 })
  offset: number;

  @ApiPropertyOptional({ type: [String], example: '' })
  status: string[];
}

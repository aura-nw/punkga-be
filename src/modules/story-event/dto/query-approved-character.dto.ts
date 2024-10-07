import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryApprovedCharacterParamDto {
  @ApiPropertyOptional()
  user_id: string;
}

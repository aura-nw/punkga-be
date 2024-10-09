import { ApiPropertyOptional } from '@nestjs/swagger';
import { CharacterSortType } from '../story-event.enum';

export class QueryApprovedCharacterParamDto {
  @ApiPropertyOptional()
  user_id: string;

  @ApiPropertyOptional({
    enum: [
      CharacterSortType.Created_At_Asc,
      CharacterSortType.Created_At_Desc,
      CharacterSortType.User_Collect_Asc,
      CharacterSortType.User_Collect_Desc,
    ],
  })
  order_by: CharacterSortType;

  @ApiPropertyOptional()
  limit: number;

  @ApiPropertyOptional()
  offset: number;
}

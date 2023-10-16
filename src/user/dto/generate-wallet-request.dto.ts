import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateWalletRequestDto {
  @ApiPropertyOptional({ example: '2c173942-a860-4a4c-ab71-9a29e2384d54' })
  user_id: string;
}

import { ApiProperty } from '@nestjs/swagger';

export class DeleteUserRequest {
  @ApiProperty()
  email: string;
}

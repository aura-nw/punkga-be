import {
  Query,
  Controller,
  Delete,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUserInterceptor } from '../interceptors/auth-user-interceptor.service';
import { DeleteUserRequest } from './dto/delete-user-request.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userSvc: UserService) {}

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Delete()
  @UseInterceptors(AuthUserInterceptor)
  delete(@Query() data: DeleteUserRequest) {
    return this.userSvc.delete(data);
  }
}

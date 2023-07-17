import {
  Query,
  Controller,
  Delete,
  UseGuards,
  UseInterceptors,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUserInterceptor } from '../interceptors/auth-user-interceptor.service';
import { DeleteUserRequest } from './dto/delete-user-request.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/role.guard';
import { LikeChapterParam } from './dto/like-chapter-request.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userSvc: UserService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin)
  @Delete()
  @UseInterceptors(AuthUserInterceptor)
  delete(@Query() data: DeleteUserRequest) {
    return this.userSvc.delete(data);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Patch('like-chapter/:chapterId')
  @UseInterceptors(AuthUserInterceptor)
  likeChapter(@Query() data: LikeChapterParam) {
    return this.userSvc.likeChapter(data);
  }
}

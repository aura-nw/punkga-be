import {
  Query,
  Controller,
  Delete,
  UseGuards,
  UseInterceptors,
  Patch,
  Put,
  Body,
  UploadedFiles,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUserInterceptor } from '../interceptors/auth-user-interceptor.service';
import { DeleteUserRequest } from './dto/delete-user-request.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/role.guard';
import { LikeChapterParam } from './dto/like-chapter-request.dto';
import { UpdateProfileRequestDto } from './dto/update-profile-request.dto';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

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

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Put('update-profile')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  updateProfile(
    @Body() data: UpdateProfileRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.userSvc.updateProfile(data, files);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../../auth/auth.guard';
import { Role } from '../../auth/role.enum';
import { RolesGuard } from '../../auth/role.guard';
import { Roles } from '../../auth/roles.decorator';
import { AuthUserInterceptor } from '../../interceptors/auth-user.interceptor';
import { DeleteUserRequest } from './dto/delete-user-request.dto';
import { UpdateProfileRequestDto } from './dto/update-profile-request.dto';
import { UserService } from './user.service';
import { ReadChapterRequestDto } from './dto/read-chapter-request.dto';
import { ConnectWalletRequestDto } from './dto/connect-wallet-request.dto';
import { CreateArtistRequestDto } from './dto/create-artist-request.dto';

@Controller('user')
@ApiTags('user')
export class UserController {
  constructor(private readonly userSvc: UserService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Post('connect')
  @UseInterceptors(AuthUserInterceptor)
  connect(@Body() data: ConnectWalletRequestDto) {
    return this.userSvc.connectPersonalWallet(data);
  }

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
  @Put('update-profile')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  updateProfile(
    @Body() data: UpdateProfileRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.userSvc.updateProfile(data, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Post('read-chapter/:chapter_id')
  @UseInterceptors(AuthUserInterceptor)
  readChapter(@Param() data: ReadChapterRequestDto) {
    return this.userSvc.readChapter(data.chapter_id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Get('available-quests')
  @UseInterceptors(AuthUserInterceptor)
  getAvailableQuests() {
    return this.userSvc.getUserAvailableQuest();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Post('artist')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  createArtistProfile(
    @Body() data: CreateArtistRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.userSvc.createArtistProfile(data, files);
  }
}

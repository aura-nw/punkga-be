import {
  Body,
  Controller,
  Ip,
  Param,
  Patch,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { CreateChapterRequestDto } from './dto/create-chapter-request.dto';
import { ChapterService } from './chapter.service';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUserInterceptor } from '../interceptors/auth-user.interceptor';
import {
  UpdateChapterParamDto,
  UpdateChapterRequestDto,
} from './dto/update-chapter-request.dto';
import { IncreaseChapterViewParamDto } from './dto/increase-chapter-view-request.dto';
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/role.guard';
import { SetRequestTimeout } from '../decorators/set-timeout.decorator';

@Controller('chapter')
export class ChapterController {
  constructor(private readonly chapterSvc: ChapterService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  @SetRequestTimeout()
  @Roles(Role.Admin)
  create(
    @Body() data: CreateChapterRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.chapterSvc.create(data, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin)
  @Put(':chapterId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  update(
    @Param() param: UpdateChapterParamDto,
    @Body() data: UpdateChapterRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.chapterSvc.update(param, data, files);
  }

  @Patch(':chapterId/increase')
  increaseView(@Ip() ip, @Param() { chapterId }: IncreaseChapterViewParamDto) {
    return this.chapterSvc.increase(ip, chapterId);
  }
}

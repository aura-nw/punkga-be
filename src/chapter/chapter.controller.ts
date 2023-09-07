import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CreateChapterRequestDto } from './dto/create-chapter-request.dto';
import { ChapterService } from './chapter.service';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUserInterceptor } from '../interceptors/auth-user.interceptor';
import {
  UpdateChapterParamDto,
  UpdateChapterRequestDto,
} from './dto/update-chapter-request.dto';
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/role.guard';
import { SetRequestTimeout } from '../decorators/set-timeout.decorator';
import { UploadInputDto } from './dto/upload.dto';
import { ViewProtectedChapterRequestDto } from './dto/view-chapter-request.dto';

@Controller('chapter')
@ApiTags('chapter')
export class ChapterController {
  constructor(private readonly chapterSvc: ChapterService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, FileInterceptor('file'))
  @SetRequestTimeout()
  @Roles(Role.Admin)
  upload(
    @Body() data: UploadInputDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.chapterSvc.upload(data, file);
  }

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

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Get(':chapterId/protected')
  @UseInterceptors(AuthUserInterceptor)
  view(@Param() data: ViewProtectedChapterRequestDto) {
    return this.chapterSvc.view(data);
  }
}

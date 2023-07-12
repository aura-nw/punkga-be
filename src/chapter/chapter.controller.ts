import {
  Body,
  Controller,
  Param,
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
import { AuthUserInterceptor } from '../interceptors/auth-user-interceptor.service';
import {
  UpdateChapterParamDto,
  UpdateChapterRequestDto,
} from './dto/update-chapter-request.dto';

@Controller('chapter')
export class ChapterController {
  constructor(private readonly chapterSvc: ChapterService) {}

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  create(
    @Body() data: CreateChapterRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.chapterSvc.create(data, files);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
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
}

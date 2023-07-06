import {
  Body,
  Controller,
  Post,
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
}

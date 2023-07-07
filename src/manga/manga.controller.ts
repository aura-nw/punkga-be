import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MangaService } from './manga.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AuthUserInterceptor } from '../interceptors/auth-user-interceptor.service';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { CreateMangaRequestDto } from './dto/create-manga-request.dto';

@Controller('manga')
export class MangaController {
  constructor(private readonly mangaSvc: MangaService) {}

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  create(
    @Body() data: CreateMangaRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    // console.log(data);
    return this.mangaSvc.create(data, files);
  }
}

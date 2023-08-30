import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MangaService } from './manga.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthUserInterceptor } from '../interceptors/auth-user.interceptor';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { CreateMangaRequestDto } from './dto/create-manga-request.dto';
import {
  UpdateMangaParamDto,
  UpdateMangaRequestDto,
} from './dto/update-manga-request.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/role.guard';
import { GetAccessMangaParamDto } from './dto/get-access-manga-request.dto';

@Controller('manga')
@ApiTags('manga')
export class MangaController {
  constructor(private readonly mangaSvc: MangaService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin)
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

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin)
  @Put(':mangaId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  update(
    @Param() param: UpdateMangaParamDto,
    @Body() data: UpdateMangaRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const { mangaId } = param;
    return this.mangaSvc.update(mangaId, data, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Get(':mangaId/get-access')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  getAccess(@Param() param: GetAccessMangaParamDto) {
    const { mangaId } = param;
    return this.mangaSvc.getAccess(mangaId);
  }
}

import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthUserInterceptor } from '../interceptors/auth-user.interceptor';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/role.guard';
import { CreatorService } from './creator.service';
import { CreateCreatorRequestDto } from './dto/create-creator-request.dto';

@Controller('creator')
@ApiTags('creator')
export class CreatorController {
  constructor(private readonly creatorSvc: CreatorService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin)
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  create(
    @Body() data: CreateCreatorRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.creatorSvc.create(data, files);
  }

  // @UseGuards(AuthGuard, RolesGuard)
  // @ApiBearerAuth()
  // @Roles(Role.Admin)
  // @Put(':mangaId')
  // @ApiConsumes('multipart/form-data')
  // @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  // update(
  //   @Param() param: UpdateMangaParamDto,
  //   @Body() data: UpdateMangaRequestDto,
  //   @UploadedFiles() files: Array<Express.Multer.File>,
  // ) {
  //   const { mangaId } = param;
  //   return this.mangaSvc.update(mangaId, data, files);
  // }
}

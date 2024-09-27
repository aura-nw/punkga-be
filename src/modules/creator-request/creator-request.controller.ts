import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthUserInterceptor } from '../../interceptors/auth-user.interceptor';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { CreatorRequestService } from './creator-request.service';
import { RolesGuard } from '../../auth/role.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/role.enum';
import {
  CreatorCreateMangaRequestDto,
  CreatorUpdateMangaParamDto,
  CreatorUpdateMangaRequestDto,
} from './dto/creator-create-manga-request.dto';

@Controller('creator-request')
@ApiTags('creator-request')
export class RequestController {
  constructor(private readonly requestSvc: CreatorRequestService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin, Role.Creator)
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  create(
    @Body() params: CreatorCreateMangaRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    // console.log(params);
    return this.requestSvc.createMangaRequest(params, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin, Role.Creator)
  @Put(':mangaId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  update(
    @Param() param: CreatorUpdateMangaParamDto,
    @Body() data: CreatorUpdateMangaRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    const { mangaId } = param;
    return this.requestSvc.updateMangaRequest(mangaId, data, files);
  }
}

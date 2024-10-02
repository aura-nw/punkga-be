import {
  Body,
  CacheInterceptor,
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
  CreatorUpdateRequestParamDto,
} from './dto/creator-create-manga-request.dto';
import { CreatorCreateChapterRequestDto } from './dto/creator-create-chapter-request.dto';
import {
  CreatorUpdateChapterParamDto,
  CreatorUpdateChapterRequestDto,
} from './dto/creator-update-chapter-request.dto';
import {
  GetRequestByCreatorAndStatusParam,
  GetRequestByCreatorAndStatusRequest,
} from './dto/creator-get-request.dto';

@Controller('creator-request')
@ApiTags('creator-request')
export class RequestController {
  constructor(private readonly requestSvc: CreatorRequestService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin, Role.Creator)
  @Post('manga')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  createManga(
    @Body() params: CreatorCreateMangaRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    // console.log(params);
    return this.requestSvc.createMangaRequest(params, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin, Role.Creator)
  @Post('manga/:mangaId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  updatemanga(
    @Param() param: CreatorUpdateMangaParamDto,
    @Body() data: CreatorUpdateMangaRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    const { mangaId } = param;
    return this.requestSvc.updateMangaRequest(mangaId, data, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin, Role.Creator)
  @Post('chapter')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  createChapter(
    @Body() params: CreatorCreateChapterRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    // console.log(params);
    return this.requestSvc.createChapterRequest(params, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin, Role.Creator)
  @Post('chapter/:chapterId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  update(
    @Param() param: CreatorUpdateChapterParamDto,
    @Body() data: CreatorUpdateChapterRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.requestSvc.updateChapterRequest(param, data, files);
  }

  @Get('request/:creator_id')
  getChapterByManga(
    @Param() param: GetRequestByCreatorAndStatusParam,
    @Query() query: GetRequestByCreatorAndStatusRequest
  ) {
    return this.requestSvc.getRequestByCreatorAndStatus(
      param.creator_id,
      query.status
    );
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin, Role.Creator)
  @Put('manga/re-submit/:request_id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  resubmitCreateManga(
    @Param() params: CreatorUpdateRequestParamDto,
    @Body() body: CreatorCreateMangaRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    // console.log(params);
    return this.requestSvc.reSubmitCreateMangaRequest(
      params.request_id,
      body,
      files
    );
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin, Role.Creator)
  @Put('chapter/re-submit/:request_id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  resubmitCreateChapter(
    @Param() params: CreatorUpdateRequestParamDto,
    @Body() body: CreatorUpdateChapterRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    console.log(params);
    return this.requestSvc.reSubmitCreateChapterRequest(
      params.request_id,
      body,
      files
    );
  }
}

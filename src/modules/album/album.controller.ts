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
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AuthGuard } from '../../auth/auth.guard';
import { Role } from '../../auth/role.enum';
import { RolesGuard } from '../../auth/role.guard';
import { Roles } from '../../auth/roles.decorator';
import { AuthUserInterceptor } from '../../interceptors/auth-user.interceptor';
import { AlbumService } from './album.service';
import { CreateAlbumRequestDto } from './dto/create-album-request.dto';
import { QueryAlbumDto } from './dto/query-album-query.dto';
import { DetailAlbumParamDto } from './dto/detail-album-request.dto';
import {
  UpdateAlbumParamDto,
  UpdateAlbumRequestDto,
} from './dto/update-album-request.dto';
import { QueryAlbumPublicDto } from './dto/query-album-public-query.dto';

@Controller('album')
@ApiTags('album')
export class AlbumController {
  constructor(private readonly albumSvc: AlbumService) {}

  @Get('public')
  @ApiOperation({ summary: 'list album - public' })
  listPublic(@Query() query: QueryAlbumPublicDto) {
    return this.albumSvc.getAllPublicAlbum(query);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Creator)
  @ApiOperation({ summary: 'list album - creator role' })
  @UseInterceptors(AuthUserInterceptor)
  list(@Query() query: QueryAlbumDto) {
    return this.albumSvc.getAll(query);
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Creator)
  @ApiOperation({ summary: 'album detail - creator role' })
  @UseInterceptors(AuthUserInterceptor)
  detailAlbumDetail(@Param() param: DetailAlbumParamDto) {
    return this.albumSvc.getDetail(param.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Creator)
  @Post()
  @ApiOperation({ summary: 'create album - creator role' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  create(
    @Body() data: CreateAlbumRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.albumSvc.create(data, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Creator)
  @Put(':id')
  @ApiOperation({ summary: 'update album - creator role' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  update(
    @Param() param: UpdateAlbumParamDto,
    @Body() data: UpdateAlbumRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.albumSvc.update(param.id, data, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Creator)
  @Delete(':id')
  @ApiOperation({ summary: 'delete album - creator role' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  delete(@Param() param: UpdateAlbumParamDto) {
    return this.albumSvc.delete(param.id);
  }
}

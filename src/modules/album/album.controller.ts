import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../../auth/auth.guard';
import { Role } from '../../auth/role.enum';
import { RolesGuard } from '../../auth/role.guard';
import { Roles } from '../../auth/roles.decorator';
import { AuthUserInterceptor } from '../../interceptors/auth-user.interceptor';
import { AlbumService } from './album.service';
import { CreateAlbumRequestDto } from './dto/create-album-request.dto';
import { QueryAlbumDto } from './dto/query-album-query.dto';

@Controller('album')
@ApiTags('album')
export class AlbumController {
  constructor(private readonly albumSvc: AlbumService) {}

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Creator)
  @UseInterceptors(AuthUserInterceptor)
  list(@Query() query: QueryAlbumDto) {
    return this.albumSvc.getAll(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Creator)
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  create(
    @Body() data: CreateAlbumRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.albumSvc.create(data, files);
  }
}

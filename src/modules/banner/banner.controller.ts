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
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../../auth/auth.guard';
import { Role } from '../../auth/role.enum';
import { RolesGuard } from '../../auth/role.guard';
import { Roles } from '../../auth/roles.decorator';
import { AuthUserInterceptor } from '../../interceptors/auth-user.interceptor';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto, UpdateBannerParam } from './dto/update-banner.dto';

@Controller('banner')
@ApiTags('banner')
export class BannerController {
  constructor(private readonly bannerSvc: BannerService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  @Roles(Role.Admin)
  create(
    @Body() body: CreateBannerDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.bannerSvc.create(body, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Put(':banner_id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  @Roles(Role.Admin)
  update(
    @Param() param: UpdateBannerParam,
    @Body() body: UpdateBannerDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.bannerSvc.update(param.banner_id, body, files);
  }
}

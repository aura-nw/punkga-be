import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  Put,
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
import { CreatorService } from './creator.service';
import { CreateCreatorRequestDto } from './dto/create-creator-request.dto';
import { GetCreatorParamDto } from './dto/get-creator-request.dto';
import {
  UpdateCreatorParamDto,
  UpdateCreatorRequestDto,
} from './dto/update-creator-request.dto';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('creator')
@ApiTags('creator')
export class CreatorController {
  constructor(private readonly creatorSvc: CreatorService) { }

  @Get(':slug')
  @UseInterceptors(CacheInterceptor)
  get(@Param() param: GetCreatorParamDto) {
    return this.creatorSvc.get(param.slug);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin)
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  create(
    @Body() data: CreateCreatorRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.creatorSvc.create(data, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin)
  @Put(':creatorId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    AuthUserInterceptor,
    ClassSerializerInterceptor,
    AnyFilesInterceptor()
  )
  update(
    @Param() param: UpdateCreatorParamDto,
    @Body() data: UpdateCreatorRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    const { creatorId } = param;
    return this.creatorSvc.update(creatorId, data, files);
  }
}

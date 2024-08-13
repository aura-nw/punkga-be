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
import { CreatorService } from './creator.service';
import { CreateCreatorRequestDto } from './dto/create-creator-request.dto';
import { GetCreatorParamDto } from './dto/get-creator-request.dto';
import {
  UpdateCreatorParamDto,
  UpdateCreatorRequestDto,
} from './dto/update-creator-request.dto';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { CreatorGraphql } from './creator.graphql';

@Controller('creator')
@ApiTags('creator')
export class CreatorController {
  constructor(
    private readonly creatorSvc: CreatorService,
    private readonly creatorGraphql: CreatorGraphql
  ) {}

  @Get(':slug')
  @UseInterceptors(CacheInterceptor)
  getBySlug(@Param() param: GetCreatorParamDto) {
    return this.creatorSvc.get(param.slug);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Creator)
  @ApiOperation({ summary: 'for creator role' })
  @UseInterceptors(CacheInterceptor, AuthUserInterceptor)
  get() {
    return this.creatorSvc.getCreator();
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
  @ApiOperation({ summary: 'for admin role' })
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

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Creator)
  @Put()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'for creator role' })
  @UseInterceptors(
    AuthUserInterceptor,
    ClassSerializerInterceptor,
    AnyFilesInterceptor()
  )
  updateCreator(
    @Body() data: UpdateCreatorRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.creatorSvc.updateCreator(data, files);
  }
}

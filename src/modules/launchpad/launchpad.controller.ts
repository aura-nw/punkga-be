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
import { LaunchpadService } from './launchpad.service';
import { CreateLaunchpadRequestDto } from './dto/create-launchpad-request.dto';
import { DeployLaunchpadRequestDtoParam } from './dto/deploy-launchpad-request.dto';

@Controller('launchpad')
@ApiTags('launchpad')
export class LaunchpadController {
  constructor(private readonly launchpadSvc: LaunchpadService) { }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  create(
    @Body() data: CreateLaunchpadRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.launchpadSvc.create(data, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Post(':id/deploy')
  @UseInterceptors(AuthUserInterceptor)
  deploy(
    @Param() param: DeployLaunchpadRequestDtoParam,
  ) {
    return this.launchpadSvc.deploy(param.id);
  }

  // @UseGuards(AuthGuard, RolesGuard)
  // @ApiBearerAuth()
  // @Roles(Role.Admin)
  // @Put(':creatorId')
  // @ApiConsumes('multipart/form-data')
  // @UseInterceptors(
  //   AuthUserInterceptor,
  //   ClassSerializerInterceptor,
  //   AnyFilesInterceptor()
  // )
  // update(
  //   @Param() param: UpdateCreatorParamDto,
  //   @Body() data: UpdateCreatorRequestDto,
  //   @UploadedFiles() files: Array<Express.Multer.File>
  // ) {
  //   const { creatorId } = param;
  //   return this.creatorSvc.update(creatorId, data, files);
  // }
}

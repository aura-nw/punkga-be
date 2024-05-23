import {
  Body,
  Controller,
  Param,
  Post,
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
import {
  DeployLaunchpadRequestDtoBody,
  DeployLaunchpadRequestDtoParam,
} from './dto/deploy-launchpad-request.dto';
import { PublishLaunchpadRequestDtoParam } from './dto/publish-launchpad-request.dto';
import { UnPublishLaunchpadRequestDtoParam } from './dto/unpublish-launchpad-request.dto';

@Controller('launchpad')
@ApiTags('launchpad')
export class LaunchpadController {
  constructor(private readonly launchpadSvc: LaunchpadService) {}

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
  @Post(':id/pre-deploy')
  @UseInterceptors(AuthUserInterceptor)
  preDeploy(@Param() param: DeployLaunchpadRequestDtoParam) {
    return this.launchpadSvc.preDeploy(param.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Post(':id/post-deploy')
  @UseInterceptors(AuthUserInterceptor)
  postDeploy(
    @Param() param: DeployLaunchpadRequestDtoParam,
    @Body() body: DeployLaunchpadRequestDtoBody
  ) {
    return this.launchpadSvc.postDeploy(param.id, body.contract_address);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Post(':id/publish')
  @UseInterceptors(AuthUserInterceptor)
  publish(@Param() param: PublishLaunchpadRequestDtoParam) {
    return this.launchpadSvc.publish(param.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Post(':id/unpublish')
  @UseInterceptors(AuthUserInterceptor)
  unpublish(@Param() param: UnPublishLaunchpadRequestDtoParam) {
    return this.launchpadSvc.unpublish(param.id);
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

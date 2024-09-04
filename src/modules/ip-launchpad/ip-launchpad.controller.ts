import {
  Body,
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
import { IPLaunchpadService } from './ip-launchpad.service';
import {
  DeployIpLaunchpadRequestDtoBody,
  DeployIpLaunchpadRequestDtoParam,
} from './dto/deploy-launchpad-request.dto';
import { PublishIpLaunchpadRequestDtoParam } from './dto/publish-launchpad-request.dto';
import { UnPublishIpLaunchpadRequestDtoParam } from './dto/unpublish-launchpad-request.dto';
import { DetailOwnedIpLaunchpadRequestDtoParam } from './dto/detail-owned-launchpad-request.dto';
import {
  EditDraftIpLaunchpadParamDto,
  EditDraftIpLaunchpadRequestDto,
} from './dto/edit-draft-launchpad-request.dto';
import {
  EditUnPublishIpLaunchpadParamDto,
  EditUnPublishIpLaunchpadRequestDto,
} from './dto/edit-unpublish-launchpad-request.dto';
import { CreateIPLaunchpadRequestDto } from './dto/create-ip-launchpad-request.dto';

@Controller('ip-launchpad')
@ApiTags('ip-launchpad')
export class IPLaunchpadController {
  constructor(private readonly iplaunchpadSvc: IPLaunchpadService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  create(
    @Body() data: CreateIPLaunchpadRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.iplaunchpadSvc.create(data, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Post(':id/pre-deploy')
  @UseInterceptors(AuthUserInterceptor)
  preDeploy(@Param() param: DeployIpLaunchpadRequestDtoParam) {
    return this.iplaunchpadSvc.preDeploy(param.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Post(':id/post-deploy')
  @UseInterceptors(AuthUserInterceptor)
  postDeploy(
    @Param() param: DeployIpLaunchpadRequestDtoParam,
    @Body() body: DeployIpLaunchpadRequestDtoBody
  ) {
    return this.iplaunchpadSvc.postDeploy(param.id, body.tx_hash);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Post(':id/publish')
  @UseInterceptors(AuthUserInterceptor)
  publish(@Param() param: PublishIpLaunchpadRequestDtoParam) {
    return this.iplaunchpadSvc.publish(param.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Post(':id/unpublish')
  @UseInterceptors(AuthUserInterceptor)
  unpublish(@Param() param: UnPublishIpLaunchpadRequestDtoParam) {
    return this.iplaunchpadSvc.unpublish(param.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Get('onwed')
  @UseInterceptors(AuthUserInterceptor)
  listOwnedIpLaunchpad() {
    return this.iplaunchpadSvc.listOwnedIpLaunchpad();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Get('owned/:id')
  @UseInterceptors(AuthUserInterceptor)
  onwedIpLaunchpadDetail(
    @Param() param: DetailOwnedIpLaunchpadRequestDtoParam
  ) {
    return this.iplaunchpadSvc.iplaunchpadDetail(param.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Put(':id/edit-draft')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  updateDraft(
    @Param() param: EditDraftIpLaunchpadParamDto,
    @Body() data: EditDraftIpLaunchpadRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    const { id } = param;
    return this.iplaunchpadSvc.editDraftIpLaunchpad(id, data, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Put(':id/edit-unpublish')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  updateUnpublish(
    @Param() param: EditUnPublishIpLaunchpadParamDto,
    @Body() data: EditUnPublishIpLaunchpadRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    const { id } = param;
    return this.iplaunchpadSvc.editUnPublishIpLaunchpad(id, data, files);
  }
}

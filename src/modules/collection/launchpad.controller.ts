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
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../../auth/auth.guard';
import { Role } from '../../auth/role.enum';
import { RolesGuard } from '../../auth/role.guard';
import { Roles } from '../../auth/roles.decorator';

import { AuthUserInterceptor } from '../../interceptors/auth-user.interceptor';
import { LaunchpadService } from './launchpad.service';
import { CreateLaunchpadRequestDto } from './dto/create-launchpad-request.dto';
import { PublishLaunchpadRequestDtoParam } from './dto/publish-launchpad-request.dto';
import { UnPublishLaunchpadRequestDtoParam } from './dto/unpublish-launchpad-request.dto';
import { DetailLaunchpadLanguageRequestDtoParam } from './dto/detail-launchpad-language-request.dto';
import { EditDraftLaunchpadRequestDto } from './dto/edit-draft-launchpad-request.dto';
import { ListLaunchpadRequestDtoParam } from './dto/list-launchpad-request.dto';
import { MintRequestDtoParam } from './dto/mint-nft-request.dto';
import {
  DetailLaunchpadBySlugRequestDtoParam,
  DetailLaunchpadRequestDtoParam,
} from './dto/detail-launchpad-request.dto';

@Controller('launchpad')
@ApiTags('launchpad')
export class LaunchpadController {
  constructor(private readonly launchpadSvc: LaunchpadService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin)
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
  @Roles(Role.Admin)
  @Post('/update')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  update(
    @Body() data: EditDraftLaunchpadRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.launchpadSvc.editDraftLaunchpad(data, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin)
  @Post(':id/publish')
  @UseInterceptors(AuthUserInterceptor)
  publish(@Param() param: PublishLaunchpadRequestDtoParam) {
    return this.launchpadSvc.publish(param.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin)
  @Post(':id/unpublish')
  @UseInterceptors(AuthUserInterceptor)
  unpublish(@Param() param: UnPublishLaunchpadRequestDtoParam) {
    return this.launchpadSvc.unpublish(param.id);
  }

  // @UseGuards(AuthGuard, RolesGuard)
  // @ApiBearerAuth()
  // @Roles(Role.Admin, Role.User)
  @Get('id/:launchpad_id')
  @UseInterceptors(AuthUserInterceptor)
  detailLaunchpadDetail(@Param() param: DetailLaunchpadRequestDtoParam) {
    return this.launchpadSvc.launchpadDetail(param.launchpad_id);
  }

  // @UseGuards(AuthGuard, RolesGuard)
  // @ApiBearerAuth()
  // @Roles(Role.Admin, Role.User)
  @Get('slug/:launchpad_slug')
  @UseInterceptors(AuthUserInterceptor)
  detailLaunchpadDetailBySlug(
    @Param() param: DetailLaunchpadBySlugRequestDtoParam
  ) {
    return this.launchpadSvc.launchpadDetailBySlug(param.launchpad_slug);
  }

  // @UseGuards(AuthGuard, RolesGuard)
  // @ApiBearerAuth()
  // @Roles(Role.Admin, Role.User)
  @Get(':launchpad_id/:language_id')
  @UseInterceptors(AuthUserInterceptor)
  detailLaunchpadLanguageDetail(
    @Param() param: DetailLaunchpadLanguageRequestDtoParam
  ) {
    return this.launchpadSvc.launchpadLanguageDetail(
      param.launchpad_id,
      param.language_id
    );
  }

  // @UseGuards(AuthGuard, RolesGuard)
  // @ApiBearerAuth()
  // @Roles(Role.Admin, Role.User)
  @Get('')
  @UseInterceptors(AuthUserInterceptor)
  listLaunchpad(@Query() params: ListLaunchpadRequestDtoParam) {
    return this.launchpadSvc.getListLaunchpad(
      params.limit,
      params.offset,
      params.status,
      params.keyword
    );
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin, Role.User)
  @Post(':launchpad_id/:nft_amount/mint')
  @UseInterceptors(AuthUserInterceptor)
  mint(@Param() param: MintRequestDtoParam) {
    return this.launchpadSvc.mintNFT(param.launchpad_id, param.nft_amount);
  }
}

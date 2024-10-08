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
import { CampaignService } from './campaign.service';
import { EnrollCampaignDto } from './dto/enroll-campaign.dto';
import { GetAllCampaignQuery } from './dto/get-all-campaign.dto';
import { GetCampaignDetailDto } from './dto/get-campaign-detail.dto';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { GetUserCampaignRankDto } from './dto/get-user-campaign-rank.dto';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignParam } from './dto/update-campaign.dto';

@Controller('campaign')
@ApiTags('campaign')
export class CampaignController {
  constructor(private readonly campaignSvc: CampaignService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  @Roles(Role.Admin)
  create(
    @Body() body: CreateCampaignDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.campaignSvc.create(body, files);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Put(':campaign_id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  @Roles(Role.Admin)
  update(
    @Param() param: UpdateCampaignParam,
    @Body() body: CreateCampaignDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.campaignSvc.update(param.campaign_id, body, files);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  getAll(@Query() query: GetAllCampaignQuery) {
    return this.campaignSvc.getAll(query.user_id);
  }

  @Get(':campaign_slug')
  @UseInterceptors(CacheInterceptor)
  getPublicCampaignDetail(@Param() param: GetCampaignDetailDto) {
    return this.campaignSvc.getPublicCampaignDetail(param.campaign_slug);
  }

  @Get(':campaign_slug/authorized')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @UseInterceptors(AuthUserInterceptor)
  getAuthorizedCampaignDetail(@Param() param: GetCampaignDetailDto) {
    return this.campaignSvc.getAuthorizedCampaignDetail(param.campaign_slug);
  }

  @Post(':campaign_id/enroll')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @UseInterceptors(AuthUserInterceptor)
  enroll(@Param() param: EnrollCampaignDto) {
    return this.campaignSvc.enroll(param.campaign_id);
  }

  @Post(':campaign_id/claim')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @UseInterceptors(AuthUserInterceptor)
  claim(@Param() param: EnrollCampaignDto) {
    return this.campaignSvc.claimReward(param.campaign_id);
  }

  @Get(':campaign_id/user-rank')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @UseInterceptors(AuthUserInterceptor)
  getUserCampaignRank(@Param() param: GetUserCampaignRankDto) {
    return this.campaignSvc.getUserRank(param.campaign_id);
  }
}

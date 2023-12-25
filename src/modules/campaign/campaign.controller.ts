import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../../auth/auth.guard';
import { Role } from '../../auth/role.enum';
import { RolesGuard } from '../../auth/role.guard';
import { Roles } from '../../auth/roles.decorator';
import { AuthUserInterceptor } from '../../interceptors/auth-user.interceptor';
import { CampaignService } from './campaign.service';
import { EnrollCampaignDto } from './dto/enroll-campaign.dto';
import { GetAllCampaignQuery } from './dto/get-all-campaign.dto';
import { GetCampaignDetailDto } from './dto/get-campaign-detail.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Controller('campaign')
@ApiTags('campaign')
export class CampaignController {
  constructor(private readonly campaignSvc: CampaignService) { }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin)
  @UseInterceptors(AuthUserInterceptor)
  create(@Body() data: CreateCampaignDto) {
    return this.campaignSvc.create(data);
  }

  @Get()
  getAll(@Query() query: GetAllCampaignQuery) {
    return this.campaignSvc.getAll(query.user_id);
  }

  @Get(':campaign_slug')
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
    return this.campaignSvc.enroll(param.campaign_id);
  }
}

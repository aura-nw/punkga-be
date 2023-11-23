import {
  Controller,
  Get,
  Param,
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

@Controller('campaign')
@ApiTags('campaign')
export class CampaignController {
  constructor(private readonly campaignSvc: CampaignService) {}

  @Get(':campaign_id/enroll')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @UseInterceptors(AuthUserInterceptor)
  enroll(@Param() param: EnrollCampaignDto) {
    return this.campaignSvc.enroll(param.campaign_id);
  }
}

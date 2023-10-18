import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthUserInterceptor } from '../interceptors/auth-user.interceptor';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/role.guard';
import { UploadNftImageRequestDto } from './dto/upload-nft-image.dto';
import { QuestService } from './quest.service';
import { GetAllCampaignQuestRequestDto } from './dto/get-all-campaign-quest.dto';

@Controller('quest')
@ApiTags('quest')
export class QuestController {
  constructor(private readonly questSvc: QuestService) {}

  @Get()
  getAllCampaignQuest(@Query() query: GetAllCampaignQuestRequestDto) {
    const userId = query.user_id;
    return this.questSvc.getAllCampaignQuest(userId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin)
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  upload(
    @Body() data: UploadNftImageRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.questSvc.upload(files.filter((f) => f.fieldname === 'file')[0]);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthUserInterceptor } from '../../interceptors/auth-user.interceptor';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/role.enum';
import { RolesGuard } from '../../auth/role.guard';
import { UploadNftImageRequestDto } from './dto/upload-nft-image.dto';
import { QuestService } from './quest.service';
// import { GetAllCampaignQuestRequestDto } from './dto/get-all-campaign-quest.dto';
import {
  GetCampaignQuestParamDto,
  GetCampaignQuestRequestDto,
} from './dto/get-campaign-quest.dto';
import { DeleteQuestParamDto } from './dto/delete-quest.dto';
import {
  AnswerQuestParamDto,
  AnswerQuestRequestDto,
} from './dto/answer-quest.dto';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('quest')
@ApiTags('quest')
export class QuestController {
  constructor(private readonly questSvc: QuestService) {}

  @Get(':quest_id')
  @UseInterceptors(CacheInterceptor)
  getCampaignQuestDetail(
    @Param() param: GetCampaignQuestParamDto,
    @Query() query: GetCampaignQuestRequestDto
  ) {
    return this.questSvc.get(param.quest_id, query.user_id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Post(':quest_id/claim')
  @UseInterceptors(AuthUserInterceptor)
  claim(@Param() data: GetCampaignQuestParamDto) {
    return this.questSvc.claimReward(data.quest_id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.User)
  @Post(':quest_id/answer')
  @UseInterceptors(AuthUserInterceptor)
  answer(
    @Param() param: AnswerQuestParamDto,
    @Body() body: AnswerQuestRequestDto
  ) {
    return this.questSvc.answerQuest(param.quest_id, body.answer);
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
    return this.questSvc.upload(
      data.name,
      files.filter((f) => f.fieldname === 'file')[0]
    );
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin)
  @Delete(':quest_id')
  @UseInterceptors(AuthUserInterceptor)
  delete(@Param() data: DeleteQuestParamDto) {
    return this.questSvc.deleteQuest(data.quest_id);
  }
}

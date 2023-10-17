import {
  Body,
  Controller,
  Get,
  Post,
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

@Controller('quest')
@ApiTags('quest')
export class QuestController {
  constructor(private readonly questSvc: QuestService) {}

  @Get()
  getAllCampaignQuest() {
    return this.questSvc.getAllCampaignQuest();
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

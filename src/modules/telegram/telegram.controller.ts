import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { TelegramService } from './telegram.service';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/role.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/role.enum';
import { AuthUserInterceptor } from '../../interceptors/auth-user.interceptor';
import { LinkUserDto } from './dto/link-user.dto';
import { SaveDonateTxDto } from './dto/save-donate-tx.dto';
import { ReadChapterDto } from './dto/read-chapter.dto';
import { SaveQuestDto } from './dto/save-quest.dto';

@Controller('telegram')
@ApiTags('telegram')
export class TelegramController {
  constructor(private readonly telegramSvc: TelegramService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.TelegramUser)
  @Get('manga/:manga_slug/chapters/:chapter_number')
  @UseInterceptors(AuthUserInterceptor)
  @ApiOperation({ summary: '' })
  readChapter(@Param() param: ReadChapterDto) {
    return this.telegramSvc.readChapter(param.manga_slug, param.chapter_number);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.TelegramUser)
  @Post('connect')
  @UseInterceptors(AuthUserInterceptor)
  @ApiOperation({ summary: '' })
  connect() {
    return this.telegramSvc.connect();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.TelegramUser)
  @Post('link')
  @UseInterceptors(AuthUserInterceptor)
  @ApiOperation({ summary: '' })
  link(@Body() body: LinkUserDto) {
    return this.telegramSvc.link(body.email, body.password);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.TelegramUser)
  @Post('save-donate-tx')
  @UseInterceptors(AuthUserInterceptor)
  @ApiOperation({ summary: '' })
  saveTx(@Body() body: SaveDonateTxDto) {
    return this.telegramSvc.saveTx(body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.TelegramUser)
  @Post('get-quest')
  @UseInterceptors(AuthUserInterceptor)
  @ApiOperation({ summary: '' })
  getQuest() {
    return this.telegramSvc.getQuest();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.TelegramUser)
  @Post('save-quest')
  @UseInterceptors(AuthUserInterceptor)
  @ApiOperation({ summary: '' })
  saveQuest(@Body() body: SaveQuestDto) {
    return this.telegramSvc.saveQuest(body.id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.TelegramUser)
  @Post('create-and-link')
  @UseInterceptors(AuthUserInterceptor)
  @ApiOperation({ summary: '' })
  createAndLink() {
    return this.telegramSvc.createAndLink();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.TelegramUser)
  @Post('get-top-donate')
  @UseInterceptors(AuthUserInterceptor)
  @ApiOperation({ summary: '' })
  getTopDonate() {
    return this.telegramSvc.getTopDonate();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.TelegramUser)
  @Post('get-top-creator-donate')
  @UseInterceptors(AuthUserInterceptor)
  @ApiOperation({ summary: '' })
  getTopCreatorDonate() {
    return this.telegramSvc.getTopCreatorDonate();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('gen-telegram-qr')
  @UseInterceptors(AuthUserInterceptor)
  @ApiOperation({ summary: '' })
  generateTelegramAccountLink() {
    return this.telegramSvc.genTelegramQr();
  }
}

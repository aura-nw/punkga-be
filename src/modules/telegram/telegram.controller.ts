import {
  Body,
  Controller,
  Get,
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

@Controller('telegram')
@ApiTags('telegram')
export class TelegramController {
  constructor(private readonly telegramSvc: TelegramService) {}

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
}

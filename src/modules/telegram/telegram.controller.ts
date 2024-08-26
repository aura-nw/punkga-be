import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { TelegramService } from './telegram.service';

@Controller('telegram')
@ApiTags('telegram')
export class TelegramController {
  constructor(private readonly telegramSvc: TelegramService) {}

  @Post()
  @ApiOperation({ summary: '' })
  auth() {
    console.log('auth');
  }
}

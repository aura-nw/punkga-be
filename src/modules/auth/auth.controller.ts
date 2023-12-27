import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('auth')
@ApiTags('auth')
export class AuthController {

  @UseGuards()
  @Get('login/zalo')
  loginZalo() {
    console.log('ok')
  }
}

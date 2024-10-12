import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authSvc: AuthService) {}

  @Post('login')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({ summary: '' })
  link(@Body() body: LoginDto) {
    return this.authSvc.login(body.email, body.password);
  }
}

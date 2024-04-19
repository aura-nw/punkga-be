import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { SignInWalletRequestDto } from './dto/signin-wallet-request.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
  ) { }

  @ApiTags('auth')
  @ApiOperation({ summary: 'Generate new access token using refresh token' })
  @Post('wallet')
  refreshAccessToken(@Body() params: SignInWalletRequestDto) {
    return this.authService.signInWithWallet(params);
  }
}

import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { GenerateWalletRequestDto } from './dto/generate-wallet-request.dto';
import { UserWalletService } from './user-wallet.service';

@Controller('user-wallet')
@ApiTags('user-wallet')
export class UserWalletController {
  constructor(private readonly userWalletSvc: UserWalletService) {}

  @Post('generate-wallet')
  generateWallet(@Headers() headers, @Body() data: GenerateWalletRequestDto) {
    return this.userWalletSvc.generateWallet(headers, data);
  }
}

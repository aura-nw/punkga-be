import {
  Body,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../../auth/auth.guard';
import { Role } from '../../auth/role.enum';
import { RolesGuard } from '../../auth/role.guard';
import { Roles } from '../../auth/roles.decorator';
import { AuthUserInterceptor } from '../../interceptors/auth-user.interceptor';
import { ChainService } from './chain.service';
import { CreateChainDto } from './dto/create-chain.dto';

@Controller('chain')
@ApiTags('chain')
export class ChainController {
  constructor(private readonly chainSvc: ChainService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post()
  @UseInterceptors(AuthUserInterceptor)
  @Roles(Role.Admin)
  create(@Body() body: CreateChainDto) {
    return this.chainSvc.create(body);
  }
}

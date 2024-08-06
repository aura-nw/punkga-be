import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../../auth/auth.guard';
import { Role } from '../../auth/role.enum';
import { RolesGuard } from '../../auth/role.guard';
import { Roles } from '../../auth/roles.decorator';
import { AuthUserInterceptor } from '../../interceptors/auth-user.interceptor';
import { FileInterceptor } from '@nestjs/platform-express';
import { ArtworkService } from './artwork.service';
import { SetRequestTimeout } from '../../decorators/set-timeout.decorator';
import { ImportArtworkDto } from './dto/import-artwork.dto';

@Controller('artwork')
@ApiTags('artwork')
export class ArtworkController {
  constructor(private readonly artworkSvc: ArtworkService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, FileInterceptor('file'))
  @SetRequestTimeout()
  @Roles(Role.Admin)
  import(
    @Body() body: ImportArtworkDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.artworkSvc.import(body, file);
  }
}

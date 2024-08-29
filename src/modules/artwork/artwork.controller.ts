import {
  Body,
  Controller,
  Delete,
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
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AuthGuard } from '../../auth/auth.guard';
import { Role } from '../../auth/role.enum';
import { RolesGuard } from '../../auth/role.guard';
import { Roles } from '../../auth/roles.decorator';
import { AuthUserInterceptor } from '../../interceptors/auth-user.interceptor';
import { FileInterceptor } from '@nestjs/platform-express';
import { ArtworkService } from './artwork.service';
import { SetRequestTimeout } from '../../decorators/set-timeout.decorator';
import { ImportArtworkDto } from './dto/import-artwork.dto';
import {
  UpdateArtworkDto,
  UpdateArtworkParamDto,
} from './dto/update-artwork.dto';
import { DeleteArtworksDto } from './dto/delete-artworks.dto';

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

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Creator)
  @Put(':id')
  @ApiOperation({ summary: 'update artwork - creator role' })
  @UseInterceptors(AuthUserInterceptor)
  update(
    @Param() param: UpdateArtworkParamDto,
    @Body() body: UpdateArtworkDto
  ) {
    return this.artworkSvc.update(param.id, body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Creator)
  @Delete()
  @ApiOperation({ summary: 'delete artworks - creator role' })
  @UseInterceptors(AuthUserInterceptor)
  delete(@Body() body: DeleteArtworksDto) {
    return this.artworkSvc.deleteArtworks(body);
  }
}

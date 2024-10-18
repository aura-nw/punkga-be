import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/auth.guard';
import { Role } from '../../auth/role.enum';
import { RolesGuard } from '../../auth/role.guard';
import { Roles } from '../../auth/roles.decorator';
import { SetRequestTimeout } from '../../decorators/set-timeout.decorator';
import { AuthUserInterceptor } from '../../interceptors/auth-user.interceptor';
import { StoryProtocolService } from './story-protocol.service';
import { GetStoryArtworkQueryDto } from './dto/get-story-artwork-request.dto';

@Controller('story-protocol')
@ApiTags('story-protocol')
export class StoryProtocolController {
  constructor(private readonly storyProtocolSvc: StoryProtocolService) {}


  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin,Role.User)
  @Get('/artwork')
  @UseInterceptors(AuthUserInterceptor)
  getMangaListForAdmin(@Query() query: GetStoryArtworkQueryDto) {
    return this.storyProtocolSvc.getStoryArtwork(query);
  }

  // @Post('submission/character')
  // @UseGuards(AuthGuard, RolesGuard)
  // @ApiBearerAuth()
  // @ApiConsumes('multipart/form-data')
  // @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  // @SetRequestTimeout()
  // @Roles(Role.User)
  // submitCharacter(
  //   @Body() data: SubmitCharacterRequestDto,
  //   @UploadedFiles() files: Array<Express.Multer.File>
  // ) {
  //   // return this.storyProtocolSvc.submitCharacter(data, files);
  // }

}

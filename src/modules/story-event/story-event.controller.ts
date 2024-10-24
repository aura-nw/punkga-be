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
import { CollectCharacterParamDto } from './dto/collect-character.dto';
import { QueryApprovedCharacterParamDto } from './dto/query-approved-character.dto';
import { SubmitArtworkRequestDto } from './dto/submit-artwork.dto';
import { SubmitCharacterRequestDto } from './dto/submit-character.dto';
import { SubmitMangaRequestDto } from './dto/submit-manga.dto';
import { StoryEventService } from './story-event.service';
import { UpdateStoryArtworkStatusRequestDto } from './dto/approve-story-artwork.dto';
import { QueryMangaParamDto } from './dto/query-manga.dto';
import { UpdateCharacterStatusRequestDto } from './dto/approve-story-character.dto';
import { RejectMangaSubmissionRequestDto } from './dto/reject-manga-submission.dto';

@Controller('story-event')
@ApiTags('story-event')
export class StoryEventController {
  constructor(private readonly storyEventSvc: StoryEventService) {}

  @Post('submission/character')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  @SetRequestTimeout()
  @Roles(Role.User)
  submitCharacter(
    @Body() data: SubmitCharacterRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.storyEventSvc.submitCharacter(data, files);
  }

  @Get('submission/character/submitted')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @UseInterceptors(AuthUserInterceptor)
  @SetRequestTimeout()
  @Roles(Role.Admin)
  getPendingCharacter() {
    return this.storyEventSvc.getSubmittedCharacter();
  }

  @Get('submission/manga/submitted')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @UseInterceptors(AuthUserInterceptor)
  @SetRequestTimeout()
  @Roles(Role.Admin)
  getPendingManga() {
    return this.storyEventSvc.getSubmittedManga();
  }

  @Post('submission/character/approve')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  @SetRequestTimeout()
  @Roles(Role.Admin)
  approveCharacter(@Body() data: UpdateCharacterStatusRequestDto) {
    return this.storyEventSvc.approveCharacter(data);
  }

  @Post('submission/artwork/approve')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  @SetRequestTimeout()
  @Roles(Role.Admin)
  approveArtwork(@Body() data: UpdateStoryArtworkStatusRequestDto) {
    return this.storyEventSvc.approveArtwork(data);
  }

  @Post('submission/manga')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  // @UseInterceptors(AuthUserInterceptor)
  @SetRequestTimeout()
  @Roles(Role.User)
  submitManga(@Body() data: SubmitMangaRequestDto) {
    return this.storyEventSvc.submitManga(data);
  }

  @Post('submission/manga/reject')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  @SetRequestTimeout()
  @Roles(Role.Admin)
  rejectMangaSubmission(@Body() data: RejectMangaSubmissionRequestDto) {
    return this.storyEventSvc.rejectMangaSubmission(data);
  }

  @Post('submission/artwork')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, AnyFilesInterceptor())
  @SetRequestTimeout()
  @Roles(Role.User)
  submitArtwork(
    @Body() data: SubmitArtworkRequestDto,
    @UploadedFiles() files: Array<Express.Multer.File>
  ) {
    return this.storyEventSvc.submitArtwork(data, files);
  }

  @Get('submission')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @UseInterceptors(AuthUserInterceptor)
  @SetRequestTimeout()
  @Roles(Role.User)
  getUserSubmissions() {
    return this.storyEventSvc.queryUserSubmission();
  }

  @Get('character')
  getCharacter(@Query() query: QueryApprovedCharacterParamDto) {
    return this.storyEventSvc.queryCharacter(query);
  }

  @Get('manga')
  getManga(@Query() query: QueryMangaParamDto) {
    return this.storyEventSvc.queryManga(query);
  }

  @Get('character/collected')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @UseInterceptors(AuthUserInterceptor)
  @SetRequestTimeout()
  @Roles(Role.User)
  getCollectedCharacter() {
    return this.storyEventSvc.queryCollectedCharacter();
  }

  @Post('character/:id/collect')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @UseInterceptors(AuthUserInterceptor)
  @SetRequestTimeout()
  @Roles(Role.User)
  collectCharacter(@Param() param: CollectCharacterParamDto) {
    return this.storyEventSvc.collectCharacter(param.id);
  }

  @Get('character/available')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @UseInterceptors(AuthUserInterceptor)
  @SetRequestTimeout()
  @Roles(Role.User)
  queryAvailableCharacter() {
    return this.storyEventSvc.queryAvailableCharacter();
  }
}

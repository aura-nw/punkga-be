import { Controller, Get, Post, Query } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { StoryEventService } from './story-event.service';
import { SubmitCharacterRequestDto } from './dto/submit-character.dto';
import { SubmitMangaRequestDto } from './dto/submit-manga.dto';
import { SubmitArtworkRequestDto } from './dto/submit-artwork.dto';

@Controller('story-event')
@ApiTags('story-event')
export class StoryEventController {
  constructor(private readonly storyEventSvc: StoryEventService) {}

  @Post('submission/character')
  submitCharacter(@Query() data: SubmitCharacterRequestDto) {
    return this.storyEventSvc.submitCharacter(data);
  }

  @Post('submission/manga')
  submitManga(@Query() data: SubmitMangaRequestDto) {
    return this.storyEventSvc.submitManga(data);
  }

  @Post('submission/artwork')
  submitArtwork(@Query() data: SubmitArtworkRequestDto) {
    return this.storyEventSvc.submitArtwork(data);
  }

  @Get('submission')
  allSubmission() {
    return 'all submission';
  }
}

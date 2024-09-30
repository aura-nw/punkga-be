import { Controller, Get, Query } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { GetRequestDto } from './dto/get-request.dto';
import { StoryEventService } from './story-event.service';

@Controller('story-event')
@ApiTags('story-event')
export class StoryEventController {
  constructor(private readonly storyEventSvc: StoryEventService) {}

  @Get()
  get(@Query() data: GetRequestDto) {
    return this.storyEventSvc.get(data.request_id);
  }
}

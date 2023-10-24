import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RepeatQuestService } from './repeat-quests.service';
import { CreateRepeatQuestRequestDto } from './dto/create-request.dto';

@Controller('repeat-quest')
@ApiTags('repeat-quest')
export class RepeatQuestController {
  constructor(private readonly repeatQuestSvc: RepeatQuestService) {}

  @Post()
  generateWallet(
    @Headers() headers,
    @Body() data: CreateRepeatQuestRequestDto
  ) {
    return this.repeatQuestSvc.create(headers, data.quest_id);
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
@ApiTags('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardSvc: LeaderboardService) {}

  @Get()
  curentRank(@Query() query: any) {
    return this.leaderboardSvc.curentRank(query.user_id);
  }
}

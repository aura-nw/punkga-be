import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GraphqlModule } from '../graphql/graphql.module';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardGraphql } from './leaderboard.graphql';
import { LeaderboardController } from './leaderboard.controller';

@Module({
  imports: [JwtModule, GraphqlModule],
  providers: [LeaderboardService, LeaderboardGraphql],
  controllers: [LeaderboardController],
})
export class LeaderboardModule {}

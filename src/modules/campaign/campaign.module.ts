import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { GraphqlModule } from '../graphql/graphql.module';
import { LevelingModule } from '../leveling/leveling.module';
import { QuestModule } from '../quest/quest.module';
import { UserModule } from '../user/user.module';
import { CampaignController } from './campaign.controller';
import { CampaignGraphql } from './campaign.graphql';
import { CampaignService } from './campaign.service';
import { UserLevelModule } from '../user-level/user-level.module';
import { UserWalletModule } from '../user-wallet/user-wallet.module';
import { RedisModule } from '../redis/redis.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    JwtModule,
    GraphqlModule,
    QuestModule,
    UserModule,
    LevelingModule,
    UserLevelModule,
    UserWalletModule,
    RedisModule,
    FilesModule,
  ],
  providers: [CampaignService, CampaignGraphql],
  controllers: [CampaignController],
})
export class CampaignModule {}

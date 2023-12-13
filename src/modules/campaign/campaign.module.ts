import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { GraphqlModule } from '../graphql/graphql.module';
import { LevelingModule } from '../leveling/leveling.module';
import { QuestModule } from '../quest/quest.module';
import { UserModule } from '../user/user.module';
import { CampaignController } from './campaign.controller';
import { CampaignGraphql } from './campaign.graphql';
import { CampaignService } from './campaign.service';
import { CampaignRewardService } from './reward.service';
import { UserLevelModule } from '../user-level/user-level.module';
import { UserWalletModule } from '../user-wallet/user-wallet.module';

@Module({
  imports: [JwtModule, GraphqlModule, QuestModule, UserModule, LevelingModule, UserLevelModule, UserWalletModule],
  providers: [CampaignService, CampaignGraphql, CampaignRewardService],
  controllers: [CampaignController],
})
export class CampaignModule { }

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GraphqlModule } from '../graphql/graphql.module';
import { CampaignService } from './campaign.service';
import { CampaignGraphql } from './campaign.graphql';
import { CampaignController } from './campaign.controller';
import { QuestModule } from '../quest/quest.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [JwtModule, GraphqlModule, QuestModule, UserModule],
  providers: [CampaignService, CampaignGraphql],
  controllers: [CampaignController],
})
export class CampaignModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GraphqlModule } from '../graphql/graphql.module';
import { CampaignService } from './campaign.service';
import { CampaignGraphql } from './campaign.graphql';
import { CampaignController } from './campaign.controller';

@Module({
  imports: [JwtModule, GraphqlModule],
  providers: [CampaignService, CampaignGraphql],
  controllers: [CampaignController],
})
export class CampaignModule {}

import { Module } from '@nestjs/common';
import { QuestService } from './quest.service';
import { FilesModule } from '../files/files.module';
import { QuestController } from './quest.controller';
import { JwtModule } from '@nestjs/jwt';
import { QuestGraphql } from './quest.graphql';
import { GraphqlModule } from '../graphql/graphql.module';
import { RepeatQuestModule } from '../repeat-quests/repeat-quests.module';
import { SocialActivitiesModule } from '../social-activites/social-activities.module';
import { SubscribersModule } from '../subscribers/subscribers.module';
import { LevelingModule } from '../leveling/leveling.module';
import { UserLevelModule } from '../user-level/user-level.module';
import { UserWalletModule } from '../user-wallet/user-wallet.module';
import { UserRewardModule } from '../user-reward/user-reward.module';
import { CheckRequirementService } from './check-requirement.service';
import { CheckRewardService } from './check-reward.service';
import { CheckConditionService } from './check-condition.service';
import { QuestRewardService } from './reward.service';
import { QuestProcessor } from './quest.processor';
import { BullModule } from '@nestjs/bull';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'quest',
    }),
    RedisModule,
    FilesModule,
    JwtModule,
    GraphqlModule,
    RepeatQuestModule,
    SocialActivitiesModule,
    UserLevelModule,
    SubscribersModule,
    LevelingModule,
    UserWalletModule,
    UserRewardModule,
  ],
  providers: [
    QuestService,
    CheckRequirementService,
    CheckConditionService,
    CheckRewardService,
    QuestRewardService,
    QuestGraphql,
    QuestProcessor
  ],
  controllers: [QuestController],
  exports: [QuestGraphql, CheckConditionService, CheckRewardService],
})
export class QuestModule { }

import { Module } from '@nestjs/common';
import { QuestService } from './quest.service';
import { FilesModule } from '../files/files.module';
import { QuestController } from './quest.controller';
import { JwtModule } from '@nestjs/jwt';
import { QuestGraphql } from './quest.graphql';
import { GraphqlModule } from '../graphql/graphql.module';
import { UserModule } from '../user/user.module';
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

@Module({
  imports: [
    FilesModule,
    JwtModule,
    GraphqlModule,
    UserModule,
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
  ],
  controllers: [QuestController],
  exports: [QuestGraphql, CheckConditionService, CheckRewardService],
})
export class QuestModule {}
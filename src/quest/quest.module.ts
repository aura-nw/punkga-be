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
import { UserQuestModule } from '../user-quests/user-quests.module';
import { SubscribersModule } from '../subscribers/subscribers.module';
import { LevelingModule } from '../leveling/leveling.module';

@Module({
  imports: [
    FilesModule,
    JwtModule,
    GraphqlModule,
    UserModule,
    RepeatQuestModule,
    SocialActivitiesModule,
    UserQuestModule,
    SubscribersModule,
    LevelingModule,
  ],
  providers: [QuestService, QuestGraphql],
  controllers: [QuestController],
  exports: [QuestGraphql],
})
export class QuestModule {}

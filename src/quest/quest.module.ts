import { Module } from '@nestjs/common';
import { QuestService } from './quest.service';
import { FilesModule } from '../files/files.module';
import { QuestController } from './quest.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [FilesModule, JwtModule],
  providers: [QuestService],
  controllers: [QuestController],
  exports: [],
})
export class QuestModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChapterModule } from './chapter/chapter.module';

@Module({
  imports: [ChapterModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

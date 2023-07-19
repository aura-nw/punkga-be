import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChapterService } from './chapter.service';
import { ChapterController } from './chapter.controller';
import { GraphqlModule } from '../graphql/graphql.module';
import { FilesModule } from '../files/files.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [JwtModule, GraphqlModule, FilesModule, RedisModule],
  providers: [ChapterService],
  controllers: [ChapterController],
})
export class ChapterModule {}

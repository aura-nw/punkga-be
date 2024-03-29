import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { GraphqlModule } from '../graphql/graphql.module';
import { FilesModule } from '../files/files.module';
import { UserGraphql } from './user.graphql';
import { MangaModule } from '../manga/manga.module';
import { QuestModule } from '../quest/quest.module';

@Module({
  imports: [JwtModule, GraphqlModule, FilesModule, MangaModule, QuestModule],
  providers: [UserService, UserGraphql],
  controllers: [UserController],
  exports: [UserGraphql],
})
export class UserModule { }

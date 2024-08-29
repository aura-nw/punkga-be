import { Module } from '@nestjs/common';
import { CreatorService } from './creator.service';
import { CreatorController } from './creator.controller';
import { JwtModule } from '@nestjs/jwt';
import { FilesModule } from '../files/files.module';
import { GraphqlModule } from '../graphql/graphql.module';
import { CreatorGraphql } from './creator.graphql';

@Module({
  imports: [JwtModule, FilesModule, GraphqlModule],
  providers: [CreatorService, CreatorGraphql],
  controllers: [CreatorController],
  exports: [CreatorService],
})
export class CreatorModule {}

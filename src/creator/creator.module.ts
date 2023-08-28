import { Module } from '@nestjs/common';
import { CreatorService } from './creator.service';
import { CreatorController } from './creator.controller';
import { JwtModule } from '@nestjs/jwt';
import { FilesModule } from '../files/files.module';
import { GraphqlModule } from '../graphql/graphql.module';

@Module({
  imports: [JwtModule, FilesModule, GraphqlModule],
  providers: [CreatorService],
  controllers: [CreatorController],
})
export class CreatorModule {}

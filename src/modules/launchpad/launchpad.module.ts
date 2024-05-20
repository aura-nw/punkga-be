import { Module } from '@nestjs/common';
import { LaunchpadService } from './launchpad.service';
import { LaunchpadController } from './launchpad.controller';
import { GraphqlModule } from '../graphql/graphql.module';
import { LaunchpadGraphql } from './launchpad.graphql';
import { FilesModule } from '../files/files.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [GraphqlModule, FilesModule, JwtModule],
  providers: [LaunchpadService, LaunchpadGraphql],
  controllers: [LaunchpadController],
  exports: [],
})
export class LaunchpadModule { }

import { Module } from '@nestjs/common';
import { IPLaunchpadService } from './ip-launchpad.service';
import { IPLaunchpadController } from './ip-launchpad.controller';
import { GraphqlModule } from '../graphql/graphql.module';
import { IPLaunchpadGraphql } from './ip-launchpad.graphql';
import { FilesModule } from '../files/files.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [GraphqlModule, FilesModule, JwtModule],
  providers: [IPLaunchpadService, IPLaunchpadGraphql],
  controllers: [IPLaunchpadController],
  exports: [],
})
export class IPLaunchpadModule {}

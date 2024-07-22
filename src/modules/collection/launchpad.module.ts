import { Module } from '@nestjs/common';
import { LaunchpadService } from './launchpad.service';
import { LaunchpadController } from './launchpad.controller';
import { GraphqlModule } from '../graphql/graphql.module';
import { LaunchpadGraphql } from './launchpad.graphql';
import { FilesModule } from '../files/files.module';
import { JwtModule } from '@nestjs/jwt';
import { UserWalletModule } from '../user-wallet/user-wallet.module';

@Module({
  imports: [GraphqlModule, FilesModule, JwtModule,UserWalletModule],
  providers: [LaunchpadService, LaunchpadGraphql],
  controllers: [LaunchpadController],
  exports: [],
})
export class LaunchpadModule { }

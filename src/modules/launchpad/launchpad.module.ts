import { Module } from '@nestjs/common';
import { LaunchpadService } from './launchpad.service';
import { LaunchpadController } from './launchpad.controller';

@Module({
  providers: [LaunchpadService],
  controllers: [LaunchpadController],
  exports: [],
})
export class LaunchpadModule { }

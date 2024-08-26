import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { GraphqlModule } from '../graphql/graphql.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

@Module({
  imports: [JwtModule, GraphqlModule],
  providers: [TelegramService],
  controllers: [TelegramController],
})
export class TelegramModule {}

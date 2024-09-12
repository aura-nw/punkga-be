import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { GraphqlModule } from '../graphql/graphql.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { TelegramGraphql } from './telegram.graphql';

@Module({
  imports: [
    JwtModule,
    GraphqlModule
  ],
  providers: [
    TelegramService, 
    TelegramGraphql
  ],
  controllers: [TelegramController],
})
export class TelegramModule { }

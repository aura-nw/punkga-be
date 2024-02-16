import { Module } from '@nestjs/common';

import { GraphqlModule } from '../graphql/graphql.module';
import { RequestGraphql } from './request.graphql';
import { RequestController } from './request.controller';
import { RequestService } from './request.service';

@Module({
  imports: [GraphqlModule],
  providers: [RequestService, RequestGraphql],
  controllers: [RequestController],
  exports: [],
})
export class RequestModule { }

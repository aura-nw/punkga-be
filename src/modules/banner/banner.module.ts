import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { GraphqlModule } from '../graphql/graphql.module';
import { FilesModule } from '../files/files.module';
import { BannerService } from './banner.service';
import { BannerGraphql } from './banner.graphql';
import { BannerController } from './banner.controller';

@Module({
  imports: [JwtModule, GraphqlModule, FilesModule],
  providers: [BannerService, BannerGraphql],
  controllers: [BannerController],
})
export class BannerModule {}

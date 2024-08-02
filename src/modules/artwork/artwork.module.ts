import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { GraphqlModule } from '../graphql/graphql.module';
import { FilesModule } from '../files/files.module';
import { ArtworkService } from './artwork.service';
import { ArtworkController } from './artwork.controller';
import { ArtworkGraphql } from './artwork.graphql';

@Module({
  imports: [JwtModule, GraphqlModule, FilesModule],
  providers: [ArtworkService, ArtworkGraphql],
  controllers: [ArtworkController],
})
export class ArtworkModule {}

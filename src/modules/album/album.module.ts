import { Module } from '@nestjs/common';
import { GraphqlModule } from '../graphql/graphql.module';
import { AlbumGraphql } from './album.graphql';
import { FilesModule } from '../files/files.module';
import { JwtModule } from '@nestjs/jwt';
import { UserWalletModule } from '../user-wallet/user-wallet.module';
import { AlbumService } from './album.service';
import { AlbumController } from './album.controller';
import { CreatorModule } from '../creator/creator.module';

@Module({
  imports: [
    GraphqlModule,
    FilesModule,
    JwtModule,
    UserWalletModule,
    CreatorModule,
  ],
  providers: [AlbumService, AlbumGraphql],
  controllers: [AlbumController],
  exports: [],
})
export class AlbumModule {}

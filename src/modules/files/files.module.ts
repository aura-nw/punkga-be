import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FileController } from './files.controller';
import { JwtModule } from '@nestjs/jwt';
import { IPFSService } from './ipfs.service';

@Module({
  imports: [JwtModule],
  providers: [FilesService, IPFSService],
  controllers: [FileController],
  exports: [FilesService, IPFSService],
})
export class FilesModule {}

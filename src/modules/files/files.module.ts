import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { IPFSService } from './ipfs.service';

@Module({
  providers: [FilesService, IPFSService],
  exports: [FilesService, IPFSService],
})
export class FilesModule { }

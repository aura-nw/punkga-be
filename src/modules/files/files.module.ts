import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FileController } from './files.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule],
  providers: [FilesService],
  controllers: [FileController],
  exports: [FilesService],
})
export class FilesModule {}

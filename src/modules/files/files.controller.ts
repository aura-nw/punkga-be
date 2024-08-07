import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthUserInterceptor } from '../../interceptors/auth-user.interceptor';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/role.enum';
import { RolesGuard } from '../../auth/role.guard';
import { FilesService } from './files.service';
import { UploadImageS3Dto } from './dto/upload.dto';

@Controller('files')
@ApiTags('files')
export class FileController {
  constructor(private readonly fileSvc: FilesService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.Admin)
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AuthUserInterceptor, FileInterceptor('file'))
  create(
    @Body() data: UploadImageS3Dto,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.fileSvc.uploadImageToS3(data.key, file);
  }
}

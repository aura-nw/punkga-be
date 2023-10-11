import { Injectable, Logger } from '@nestjs/common';

import { FilesService } from '../files/files.service';

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(private filesService: FilesService) {}

  async upload(file: Express.Multer.File) {
    try {
      const url = await this.filesService.uploadImageToS3(`nft`, file);

      this.logger.debug(`uploading nft image ${file.originalname} success`);
      return {
        url,
      };
    } catch (errors) {
      return {
        errors,
      };
    }
  }
}

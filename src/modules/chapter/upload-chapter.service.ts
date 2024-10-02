import { readdirSync } from 'fs';
import path from 'path';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FilesService } from '../files/files.service';
import {
  ChapterImage,
  ChapterLanguage,
} from './dto/create-chapter-request.dto';
import { IFileInfo, IUploadedFile } from './interfaces';

@Injectable()
export class UploadChapterService {
  private readonly logger = new Logger(UploadChapterService.name);

  constructor(
    private configService: ConfigService,
    private filesService: FilesService
  ) {}

  async uploadThumbnail(
    files: Array<Express.Multer.File>,
    userId: string,
    manga_id: number,
    chapter_number: number
  ) {
    const thumbnail = files.filter((f) => f.fieldname === 'thumbnail')[0];
    let thumbnail_url = '';
    if (thumbnail) {
      thumbnail_url = await this.filesService.uploadThumbnailToS3(
        manga_id,
        chapter_number,
        thumbnail
      );
    }
    return thumbnail_url;
  }

  buildUploadImagesData(chapter_images: ChapterImage, storageFolder: string) {
    const uploadImagesData = [];
    chapter_images.chapter_languages.forEach(
      (chapterLanguage: ChapterLanguage) => {
        if (chapterLanguage.file_name !== '') {
          uploadImagesData.push({
            languageId: chapterLanguage.language_id,
            filePath: path.join(storageFolder, chapterLanguage.file_name),
          });
        }
      }
    );
    return uploadImagesData;
  }

  async uploadChapterLanguagesFiles(data: {
    userId: string;
    mangaId: number;
    chapterNumber: number;
    storageFolder: string;
    chapterImages: ChapterImage;
  }): Promise<IUploadedFile[]> {
    const { userId, mangaId, chapterNumber, storageFolder, chapterImages } =
      data;
    const uploadImageData = this.buildUploadImagesData(
      chapterImages,
      storageFolder
    );

    this.logger.debug(`upload chapter files.. ${JSON.stringify(userId)}`);

    // UnZip file
    await Promise.all(
      uploadImageData.map((element) => {
        const outputPath = path.join(
          __dirname,
          '../../../uploads',
          userId,
          'unzip',
          element.languageId.toString()
        );

        return this.filesService.unzipFile(element.filePath, outputPath);
      })
    );

    // Validate files in folder
    const promises: Promise<IFileInfo>[] = [];
    // const allowedFiles: IFileInfo[] = [];

    uploadImageData.forEach((element) => {
      promises.push(
        ...readdirSync(`./uploads/${userId}/unzip/${element.languageId}`).map(
          (f: string) =>
            this.filesService.detectFile(
              `./uploads/${userId}/unzip/${element.languageId}`,
              f,
              element.languageId
            )
        )
      );
    });
    const fileExtensions = await Promise.all(promises);

    const allowedFiles = fileExtensions
      .filter((fe) => fe.type.includes('image'))
      .sort((a, b) => a.order - b.order);

    // build upload files
    const uploadFiles = allowedFiles.map((file) => {
      const s3SubFolder =
        this.configService.get<string>('aws.s3SubFolder') || 'images';
      const keyName = `${s3SubFolder}/manga-${mangaId}/chapter-${chapterNumber}/lang-${file.languageId}/${file.fileName}`;

      return {
        name: file.fileName,
        key_name: keyName,
        type: file.type,

        upload_path: file.fullPath,
        image_path: new URL(
          keyName,
          this.configService.get<string>('aws.queryEndpoint')
        ).href,
        order: file.order,
        language_id: file.languageId,
      };
    });

    // upload files

    // chunk array to small array
    const chunkSize = 4;
    for (let i = 0; i < uploadFiles.length; i += chunkSize) {
      const chunked = uploadFiles.slice(i, i + chunkSize);
      this.logger.debug(`Upload process: ${i}/${uploadFiles.length}`);

      // Upload to S3
      try {
        await Promise.all(
          chunked.map((f) =>
            this.filesService.uploadToS3(f.key_name, f.upload_path, f.type)
          )
        );
      } catch (error) {
        throw Error(`upload to s3 failed - ${error.message}`);
      }
    }

    this.logger.debug(
      `Upload process: ${uploadFiles.length}/${uploadFiles.length}`
    );

    return uploadFiles;
  }
}

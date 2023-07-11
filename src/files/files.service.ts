import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { MAGIC_MIME_TYPE, Magic } from 'mmmagic';
import * as decompress from 'decompress';
import { IFileInfo } from '../chapter/interfaces';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  constructor(private configService: ConfigService) {}

  unzipFile(file: Buffer | string, outputPath: string): Promise<boolean> {
    this.logger.debug(file);
    return new Promise((resolve, reject) => {
      decompress(file, outputPath)
        .then((files: decompress.File[]) => {
          this.logger.debug('Files unzipped successfully', files.length);
          return resolve(true);
        })
        .catch((error: Error) => {
          this.logger.error(error);
          return reject(error);
        });
    });
  }

  detectFile(
    filePath: string,
    fileName: string,
    languageId?: number,
  ): Promise<IFileInfo> {
    return new Promise((resolve, reject) => {
      const file = `${filePath}/${fileName}`;

      const magic = new Magic(MAGIC_MIME_TYPE);
      magic.detectFile(file, (err, result) => {
        if (err) return reject(err);
        this.logger.debug(filePath, result);
        return resolve({
          fullPath: file,
          fileName,
          order: parseInt(fileName.replace(/\.[^/.]+$/, ''), 10),
          type: typeof result === 'string' ? result : result[0],
          languageId,
        });
      });
    });
  }

  async uploadThumbnailToS3(
    mangaId: number,
    chapterNumber: number,
    thumbnail: IFileInfo,
  ): Promise<string> {
    if (!thumbnail.type.includes('image')) {
      throw Error('thumbnail not valid');
    }
    const keyName = `manga-${mangaId}/chapter-${chapterNumber}/thumbnail.${thumbnail.fileName
      .split('.')
      .pop()}`;
    const filePath = thumbnail.fullPath;
    const result = await this.uploadToS3(keyName, filePath);

    if (result.$metadata.httpStatusCode !== 200) {
      throw new Error('Upload thumbnail fail' + JSON.stringify(result));
    }
    return new URL(keyName, this.configService.get<string>('aws.queryEndpoint'))
      .href;
  }

  async uploadImageToS3(
    mangaId: number,
    f: Express.Multer.File,
  ): Promise<string> {
    // upload file to s3
    if (!f.mimetype.includes('image')) {
      throw Error('file type is not valid');
    }
    // const keyName = `manga-${mangaId}/${f.fieldname}.${f.originalname
    //   .split('.')
    //   .pop()}`;
    const keyName = `manga-${mangaId}/${f.originalname}`;

    await this.uploadToS3(keyName, f.buffer);
    return new URL(keyName, this.configService.get<string>('aws.queryEndpoint'))
      .href;
  }

  async uploadToS3(keyName: string, filePath: string | Buffer) {
    const file =
      typeof filePath === 'string' ? readFileSync(filePath) : filePath;

    const client = new S3Client({
      region: this.configService.get<string>('aws.region'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws.keyid'),
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey'),
      },
    });

    const bucketName = this.configService.get<string>('aws.bucketName');

    // Create a promise on S3 service object
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: keyName,
      Body: file,
    });
    return client.send(command);
  }
}

import {
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { MAGIC_MIME_TYPE, Magic } from 'mmmagic';
import decompress from 'decompress';
import { IFileInfo } from '../chapter/interfaces';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  constructor(private configService: ConfigService) {}

  unzipFile(file: string, outputPath: string): Promise<boolean> {
    this.logger.debug(`Unzip ${file}...`);
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
    languageId?: number
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
    file: Express.Multer.File
  ): Promise<string> {
    if (!file.mimetype.includes('image')) {
      throw Error('thumbnail not valid');
    }
    const s3SubFolder =
      this.configService.get<string>('aws.s3SubFolder') || 'images';
    const keyName = `${s3SubFolder}/manga-${mangaId}/chapter-${chapterNumber}/${file.originalname}`;
    const result = await this.uploadToS3(keyName, file.buffer, file.mimetype);

    if (result.$metadata.httpStatusCode !== 200) {
      throw new Error('Upload thumbnail fail' + JSON.stringify(result));
    }
    return new URL(keyName, this.configService.get<string>('aws.queryEndpoint'))
      .href;
  }

  async uploadImageToS3(key: string, f: Express.Multer.File): Promise<string> {
    // upload file to s3
    if (!f.mimetype.includes('image')) {
      throw Error('file type is not valid');
    }
    // const keyName = `manga-${mangaId}/${f.fieldname}.${f.originalname
    //   .split('.')
    //   .pop()}`;
    const s3SubFolder =
      this.configService.get<string>('aws.s3SubFolder') || 'images';
    const keyName = `${s3SubFolder}/${key}/${f.originalname}`;

    const extension = f.originalname.split('.').pop();
    await this.uploadToS3(keyName, f.buffer, f.mimetype, extension);
    return new URL(keyName, this.configService.get<string>('aws.queryEndpoint'))
      .href;
  }

  async uploadToS3(
    keyName: string,
    filePath: string | Buffer,
    mimetype: string,
    extension?: string
  ) {
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
    this.logger.debug(`Upload key: ${keyName} to bucket ${bucketName}`);

    const input: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: keyName,
      Body: file,
      ContentType: mimetype,
    };

    if (extension && extension === 'svg')
      input.Metadata = {
        'Content-Type': 'image/svg+xml',
      };

    // Create a promise on S3 service object
    const command = new PutObjectCommand(input);
    return client.send(command);
  }
}

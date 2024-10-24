import decompress from 'decompress';
import { readFileSync } from 'fs';
import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { Magic, MAGIC_MIME_TYPE } from 'mmmagic';

import {
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
  GetObjectCommandOutput,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IFileInfo } from '../chapter/interfaces';
import sharp from 'sharp';

@Injectable()
export class FilesService implements OnModuleInit {
  private readonly logger = new Logger(FilesService.name);
  private ipfsClient: IPFSHTTPClient;
  private s3Client: S3Client;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      endpoint:
        this.configService.get<string>('aws.s3endpoint') ||
        'https://s3.ap-southeast-1.amazonaws.com',
      region: this.configService.get<string>('aws.region'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws.keyid'),
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey'),
      },
    });
  }

  onModuleInit() {
    const ipfsUrl = this.configService.get<string>('network.ipfsUrl');

    this.ipfsClient = create({
      url: ipfsUrl,
      timeout: 60000,
    });
  }

  resize(buffer: Buffer, width = 1366, height = 768, quality = 80) {
    return sharp(buffer)
      .resize(width, height, { fit: 'inside' })
      .png({ quality })
      .toBuffer()
      .catch(function (err) {
        console.log('Error occured ', err);
        return buffer;
      });
  }

  getKeyName = (file: Express.Multer.File, folderName: string) => {
    const s3SubFolder =
      this.configService.get<string>('aws.s3SubFolder') || 'images';
    return `${s3SubFolder}/${folderName}/${file.fieldname}-${file.originalname}`;
  };

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

  async uploadImageToIpfs(file: Express.Multer.File) {
    if (!file.mimetype.includes('image')) {
      throw Error('file type is not valid');
    }

    const response = await this.ipfsClient.add(
      {
        path: file.originalname,
        content: file.buffer,
      },
      {
        wrapWithDirectory: true,
      }
    );

    return {
      cid: response.cid.toString(),
      originalname: file.originalname,
    };

    // return `/ipfs/${response.cid.toString()}/${file.originalname}`;
  }

  async uploadFileToIpfs(buffer: Buffer, originalname: string) {
    const response = await this.ipfsClient.add(
      {
        path: originalname,
        content: buffer,
      },
      {
        wrapWithDirectory: true,
      }
    );

    return {
      cid: response.cid.toString(),
      originalname,
    };

    // return `/ipfs/${response.cid.toString()}/${file.originalname}`;
  }

  async uploadMetadataToIpfs(object: any, path: string) {
    const content = JSON.stringify(object);
    await this.ipfsClient.files.write(path, content, { create: true });
    const metadataContractCid = (
      await this.ipfsClient.files.stat(path)
    ).cid.toString();

    return {
      cid: metadataContractCid,
    };
  }

  async uploadImageToS3(key: string, f: Express.Multer.File): Promise<string> {
    // upload file to s3
    if (!f.mimetype.includes('image')) {
      throw Error('file type is not valid');
    }

    const s3SubFolder =
      this.configService.get<string>('aws.s3SubFolder') || 'images';
    const keyName = `${s3SubFolder}/${key}/${f.originalname}`;

    await this.uploadToS3(keyName, f.buffer, f.mimetype);
    return new URL(keyName, this.configService.get<string>('aws.queryEndpoint'))
      .href;
  }

  async uploadToS3(
    keyName: string,
    filePath: string | Buffer,
    mimetype: string
  ) {
    const file =
      typeof filePath === 'string' ? readFileSync(filePath) : filePath;

    const bucketName = this.configService.get<string>('aws.bucketName');
    this.logger.debug(`Upload key: ${keyName} to bucket ${bucketName}`);

    const input: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: keyName,
      Body: file,
      ContentType: mimetype,
    };

    // Create a promise on S3 service object
    const command = new PutObjectCommand(input);
    return this.s3Client.send(command);
  }

  async downloadFromS3(keyName: string): Promise<GetObjectCommandOutput> {
    const client = new S3Client({
      region: this.configService.get<string>('aws.region'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws.keyid'),
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey'),
      },
    });

    const bucketName = this.configService.get<string>('aws.bucketName');
    this.logger.debug(`Download key: ${keyName} from bucket ${bucketName}`);

    const input = {
      Bucket: bucketName,
      Key: keyName,
    };

    // Create a promise on S3 service object
    const command = new GetObjectCommand(input);
    return client.send(command);
  }
}

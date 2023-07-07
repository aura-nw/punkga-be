import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as decompress from 'decompress';
import * as mmmagic from 'mmmagic';
import * as _ from 'lodash';
import {
  ChapterImage,
  CreateChapterRequestDto,
} from './dto/create-chapter-request.dto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'fs';
import * as path from 'path';
import { ContextProvider } from '../providers/contex.provider';
import { IChapterLanguages, IFileInfo, IUploadedFile } from './interfaces';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ChapterService {
  private readonly logger = new Logger(ChapterService.name);

  constructor(private configService: ConfigService) {}

  async create(
    data: CreateChapterRequestDto,
    files: Array<Express.Multer.File>,
  ) {
    const { userId, token } = ContextProvider.getAuthUser();
    const {
      chapter_number,
      manga_id,
      chapter_name,
      chapter_type,
      pushlish_date,
      status,
      // chapter_images,
    } = data;
    const chapter_images = plainToInstance(
      ChapterImage,
      JSON.parse(data.chapter_images),
    );

    const thumbnailFileName = files.filter(
      (f) => f.fieldname === 'thumbnail',
    )[0].originalname;

    const storageFolder = `./uploads/${userId}`;
    if (!existsSync(storageFolder)) {
      mkdirSync(storageFolder, { recursive: true });
    }

    files.forEach((file) => {
      writeFileSync(`./uploads/${userId}/${file.originalname}`, file.buffer);
    });

    const thumbnailFile = await this.detectFile(
      `./uploads/${userId}`,
      thumbnailFileName,
    );
    const thumbnailUrl = await this.uploadThumbnailToS3(
      manga_id,
      chapter_number,
      thumbnailFile,
    );

    // insert chapter to DB
    const headers = {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const variables = {
      manga_id,
      chapter_name,
      chapter_number,
      chapter_type,
      pushlish_date,
      status,
      thumbnail_url: thumbnailUrl,
    };

    const response = await axios.post(
      'http://localhost:8080/v1/graphql',
      {
        query: `
          mutation AddChapter($manga_id: Int, $chapter_name: String, $chapter_number: Int, $chapter_type: String, $thumbnail_url: String = "", $status: String = "CREATED", $pushlish_date: timestamptz) {
            insert_chapters_one(object: {chapter_name: $chapter_name, chapter_number: $chapter_number, chapter_type: $chapter_type, thumbnail_url: $thumbnail_url, manga_id: $manga_id, status: $status, pushlish_date: $pushlish_date}) {
              id
              chapter_name
              chapter_number
              pushlish_date
              status
              thumbnail_url
              created_at
            }
          }
        `,
        variables,
        operationName: 'AddChapter',
      },
      { headers },
    );

    if (response.data.errors && response.data.errors.length > 0) {
      return response.data;
    }

    const chapterId = response.data.data.insert_chapters_one.id;

    // upload chapter languages
    const uploadChapterResult = await this.uploadChapterLanguagesFiles({
      userId,
      mangaId: manga_id,
      chapterNumber: chapter_number,
      thumbnailPath: path.join(storageFolder, thumbnailFileName),
      chapterImagePaths: chapter_images.chapter_languages.map((m: any) => ({
        languageId: m.language_id,
        filePath: path.join(storageFolder, m.file_name),
      })),
    });

    // insert to DB
    const groupLanguageChapter = _.groupBy(
      uploadChapterResult,
      (chapter) => chapter.language_id,
    );
    const chapterLanguages = chapter_images.chapter_languages.map((m) => ({
      languageId: m.language_id,
      detail: JSON.stringify(
        groupLanguageChapter[`${m.language_id}`].map((r) => ({
          order: r.order,
          image_path: r.image_path,
        })),
      ),
    }));

    const result = await this.insertChapterLanguages(
      token,
      chapterId,
      chapterLanguages,
    );

    if (result.errors && result.errors.length > 0) {
      return result;
    }

    return response.data;
  }

  async insertChapterLanguages(
    token: string,
    chapterId: number,
    data: {
      languageId: number;
      detail: string;
    }[],
  ) {
    // const { chapterId, languageId, detail } = data;
    const headers = {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const variables = {
      chapter_languages: data.map((d) => ({
        chapter_id: chapterId,
        language_id: d.languageId,
        detail: d.detail,
      })),
    };

    const response = await axios.post(
      'http://localhost:8080/v1/graphql',
      {
        query: `
          mutation InsertChapterLanguages($chapter_languages: [chapter_languages_insert_input!] = {chapter_id: 10, language_id: 10, detail: ""}) {
            insert_chapter_languages(objects: $chapter_languages) {
              affected_rows
            }
          }
        `,
        variables,
        operationName: 'InsertChapterLanguages',
      },
      { headers },
    );
    return response.data;
  }

  async uploadChapterLanguagesFiles(_payload: {
    userId: string;
    mangaId: number;
    chapterNumber: number;
    thumbnailPath: string;
    chapterImagePaths: IChapterLanguages[];
  }): Promise<IUploadedFile[]> {
    const { userId, mangaId, chapterNumber, chapterImagePaths } = _payload;
    this.logger.debug(
      `job handler: printing something to test.. ${JSON.stringify(userId)}`,
    );

    // UnZip file
    await Promise.all(
      chapterImagePaths.map((element) =>
        this.unzipFile(
          element.filePath,
          path.join(
            __dirname,
            '../../uploads',
            userId,
            'unzip',
            element.languageId.toString(),
          ),
        ),
      ),
    );

    // Validate files in folder
    const promises: Promise<IFileInfo>[] = [];
    const allowedFiles: IFileInfo[] = [];

    chapterImagePaths.forEach((element) => {
      promises.push(
        ...readdirSync(`./uploads/${userId}/unzip/${element.languageId}`).map(
          (f: string) =>
            this.detectFile(
              `./uploads/${userId}/unzip/${element.languageId}`,
              f,
              element.languageId,
            ),
        ),
      );
    });
    const fileExtensions = await Promise.all(promises);

    allowedFiles.push(
      ...fileExtensions
        .filter((fe) => fe.type.includes('image'))
        .sort((a, b) => a.order - b.order),
    );

    const uploadFiles = allowedFiles.map((f) => {
      const keyName = `manga-${mangaId}/chapter-${chapterNumber}/lang-${f.languageId}/${f.fileName}`;
      return {
        name: f.fileName,
        key_name: keyName,

        upload_path: f.fullPath,
        image_path: new URL(
          keyName,
          this.configService.get<string>('aws.queryEndpoint'),
        ).href,
        order: f.order,
        language_id: f.languageId,
      };
    });

    // Upload to S3
    const uploadResult = await Promise.all(
      uploadFiles.map((f) => this.uploadToS3(f.key_name, f.upload_path)),
    );
    if (
      uploadResult.filter((r) => r.$metadata.httpStatusCode === 200).length !==
      allowedFiles.length
    ) {
      throw Error(`upload failed - ${JSON.stringify(uploadResult)}`);
    }
    return uploadFiles;
  }

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
      const { MAGIC_MIME_TYPE, Magic } = mmmagic;

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

  async uploadToS3(keyName: string, filePath: string) {
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
      Body: readFileSync(filePath),
    });
    return client.send(command);
  }
}

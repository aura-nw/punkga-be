import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import * as _ from 'lodash';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import rimraf from 'rimraf';
import {
  ChapterImage,
  CreateChapterRequestDto,
} from './dto/create-chapter-request.dto';
import { ContextProvider } from '../providers/contex.provider';
import { IChapterLanguages, IFileInfo, IUploadedFile } from './interfaces';
import { GraphqlService } from '../graphql/graphql.service';
import { FilesService } from '../files/files.service';
import {
  UpdateChapterParamDto,
  UpdateChapterRequestDto,
} from './dto/update-chapter-request.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ChapterService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private configService: ConfigService,
    private graphqlSvc: GraphqlService,
    private filesService: FilesService,
    private redisClientService: RedisService,
  ) {}

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
    } = data;
    const chapter_images = plainToInstance(
      ChapterImage,
      JSON.parse(data.chapter_images),
    );

    const storageFolder = `./uploads/${userId}`;
    if (!existsSync(storageFolder)) {
      mkdirSync(storageFolder, { recursive: true });
    }

    files.forEach((file) => {
      writeFileSync(`./uploads/${userId}/${file.originalname}`, file.buffer);
    });

    let thumbnailUrl = '';
    const thumbnail = files.filter((f) => f.fieldname === 'thumbnail')[0];
    if (thumbnail) {
      const thumbnailFile = await this.filesService.detectFile(
        `./uploads/${userId}`,
        thumbnail.originalname,
      );
      thumbnailUrl = await this.filesService.uploadThumbnailToS3(
        manga_id,
        chapter_number,
        thumbnailFile,
      );
    }

    // insert chapter to DB
    const variables = {
      manga_id,
      chapter_name,
      chapter_number,
      chapter_type,
      pushlish_date,
      status,
      thumbnail_url: thumbnailUrl,
    };

    const result = await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `mutation AddChapter($manga_id: Int, $chapter_name: String, $chapter_number: Int, $chapter_type: String, $thumbnail_url: String = "", $status: String = "CREATED", $pushlish_date: timestamptz) {
        insert_chapters_one(object: {chapter_name: $chapter_name, chapter_number: $chapter_number, chapter_type: $chapter_type, thumbnail_url: $thumbnail_url, manga_id: $manga_id, status: $status, pushlish_date: $pushlish_date}) {
          id
          chapter_name
          chapter_number
          pushlish_date
          status
          thumbnail_url
          created_at
        }
      }`,
      'AddChapter',
      variables,
    );

    if (result.errors && result.errors.length > 0) {
      return result;
    }

    const chapterId = result.data.insert_chapters_one.id;

    // upload chapter languages
    const uploadChapterResult = await this.uploadChapterLanguagesFiles({
      userId,
      mangaId: manga_id,
      chapterNumber: chapter_number,
      chapterImagePaths: chapter_images.chapter_languages.map((m: any) => ({
        languageId: m.language_id,
        filePath: path.join(storageFolder, m.file_name),
      })),
    });

    // remove files
    rimraf.sync(storageFolder);

    // insert to DB
    if (uploadChapterResult.length > 0) {
      const groupLanguageChapter = _.groupBy(
        uploadChapterResult,
        (chapter) => chapter.language_id,
      );
      const chapterLanguages = chapter_images.chapter_languages.map((m) => ({
        languageId: m.language_id,
        detail: groupLanguageChapter[`${m.language_id}`].map((r) => ({
          order: r.order,
          image_path: r.image_path,
        })),
      }));

      const updateResult = await this.insertChapterLanguages(
        token,
        chapterId,
        chapterLanguages,
      );

      if (updateResult.errors && updateResult.errors.length > 0) {
        return updateResult;
      }
    }

    return result.data;
  }

  async update(
    param: UpdateChapterParamDto,
    data: UpdateChapterRequestDto,
    files: Array<Express.Multer.File>,
  ) {
    const { chapterId: chapter_id } = param;
    const { userId, token } = ContextProvider.getAuthUser();

    const storageFolder = `./uploads/${userId}`;

    const {
      chapter_number,
      chapter_name,
      chapter_type,
      pushlish_date,
      status,
    } = data;

    // get chapter info
    const chapter = await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `query GetChapterInfo($id: Int!) {
        chapters_by_pk(id: $id) {
          manga_id
          chapter_number
          thumbnail_url
        }
      }`,
      'GetChapterInfo',
      {
        id: chapter_id,
      },
    );
    if (!chapter.data.chapters_by_pk || chapter.data.chapters_by_pk === null) {
      throw Error('Not found');
    }

    if (!existsSync(storageFolder)) {
      mkdirSync(storageFolder, { recursive: true });
    }

    const { manga_id } = chapter.data.chapters_by_pk;
    let { thumbnail_url } = chapter.data.chapters_by_pk;

    const chapter_images = plainToInstance(
      ChapterImage,
      JSON.parse(data.chapter_images),
    );

    files.forEach((file) => {
      writeFileSync(`./uploads/${userId}/${file.originalname}`, file.buffer);
    });

    const thumbnail = files.filter((f) => f.fieldname === 'thumbnail')[0];
    if (thumbnail) {
      const thumbnailFile = await this.filesService.detectFile(
        `./uploads/${userId}`,
        thumbnail.originalname,
      );
      thumbnail_url = await this.filesService.uploadThumbnailToS3(
        manga_id,
        chapter_number,
        thumbnailFile,
      );
    }

    // insert chapter to DB
    const variables = {
      id: chapter_id,
      chapter_name,
      chapter_number,
      chapter_type,
      pushlish_date,
      status,
      thumbnail_url,
    };

    const result = await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateChapterByPK($id: Int!, $chapter_name: String, $chapter_number: Int, $chapter_type: String, $thumbnail_url: String, $status: String = "", $pushlish_date: timestamptz = "") {
        update_chapters_by_pk(pk_columns: {id: $id}, _set: {chapter_name: $chapter_name, chapter_type: $chapter_type, thumbnail_url: $thumbnail_url, chapter_number: $chapter_number, status: $status, pushlish_date: $pushlish_date}) {
          id
          chapter_name
          chapter_number
          chapter_type
          thumbnail_url
          updated_at
          manga_id
        }
      }`,
      'UpdateChapterByPK',
      variables,
    );

    if (result.errors && result.errors.length > 0) {
      return result;
    }

    // const chapterId = result.data.insert_chapters_one.id;

    // upload chapter languages
    const uploadChapterResult = await this.uploadChapterLanguagesFiles({
      userId,
      mangaId: manga_id,
      chapterNumber: chapter_number,
      chapterImagePaths: chapter_images.chapter_languages.map((m: any) => ({
        languageId: m.language_id,
        filePath: path.join(storageFolder, m.file_name),
      })),
    });

    // remove files
    rimraf.sync(storageFolder);

    if (uploadChapterResult.length > 0) {
      // insert to DB
      const groupLanguageChapter = _.groupBy(
        uploadChapterResult,
        (chapter) => chapter.language_id,
      );
      const chapterLanguages = chapter_images.chapter_languages.map((m) => ({
        languageId: m.language_id,
        detail: groupLanguageChapter[`${m.language_id}`].map((r) => ({
          order: r.order,
          image_path: r.image_path,
        })),
      }));

      const updateChapterLangResult = await Promise.all(
        this.updateChapterLanguages(token, chapter_id, chapterLanguages),
      );
      this.logger.log(updateChapterLangResult);
    }

    return result.data;
  }

  //PATCH
  async increase(chapterId: number) {
    // get chapter info
    const { data } = await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `query GetChapter($id: Int!) {
        chapters_by_pk(id: $id) {
          id
          status
        }
      }`,
      'GetChapter',
      {
        id: chapterId,
      },
    );

    if (!data.chapters_by_pk || data.chapters_by_pk === null) {
      throw new NotFoundException('chapter not found');
    }

    // set chapter to set
    this.redisClientService.client.sAdd(
      [
        this.configService.get<string>('app.name'),
        this.configService.get<string>('app.env'),
        'chapters',
      ].join(':'),
      chapterId.toString(),
    );

    // increase
    this.redisClientService.client.incr(
      [
        this.configService.get<string>('app.name'),
        this.configService.get<string>('app.env'),
        'chapter',
        chapterId.toString(),
        'view',
      ].join(':'),
    );
    return {
      success: true,
    };
  }

  async insertChapterLanguages(
    token: string,
    chapterId: number,
    data: {
      languageId: number;
      detail: any;
    }[],
  ) {
    const variables = {
      chapter_languages: data.map((d) => ({
        chapter_id: chapterId,
        language_id: d.languageId,
        detail: d.detail,
      })),
    };

    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `mutation InsertChapterLanguages($chapter_languages: [chapter_languages_insert_input!] = {chapter_id: 10, language_id: 10, detail: ""}) {
        insert_chapter_languages(objects: $chapter_languages) {
          affected_rows
        }
      }`,
      'InsertChapterLanguages',
      variables,
    );
  }

  updateChapterLanguages(
    token: string,
    chapterId: number,
    data: {
      languageId: number;
      detail: any;
    }[],
  ) {
    return data.map((chapterLanguage) => {
      return this.graphqlSvc.query(
        this.configService.get<string>('graphql.endpoint'),
        token,
        `mutation UpdateChapterLanguague($chapter_id: Int!, $language_id: Int!, $detail: jsonb! = "") {
          insert_chapter_languages(objects: {chapter_id: $chapter_id, language_id: $language_id, detail: $detail}, on_conflict: {constraint: chapter_languages_chapter_id_language_id_key, update_columns: detail}) {
            affected_rows
          }
        }`,
        'UpdateChapterLanguague',
        {
          chapter_id: chapterId,
          language_id: chapterLanguage.languageId,
          detail: chapterLanguage.detail,
        },
      );
    });
  }

  async uploadChapterLanguagesFiles(_payload: {
    userId: string;
    mangaId: number;
    chapterNumber: number;
    chapterImagePaths: IChapterLanguages[];
  }): Promise<IUploadedFile[]> {
    const { userId, mangaId, chapterNumber, chapterImagePaths } = _payload;
    this.logger.debug(
      `job handler: printing something to test.. ${JSON.stringify(userId)}`,
    );

    // UnZip file
    await Promise.all(
      chapterImagePaths.map((element) =>
        this.filesService.unzipFile(
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
            this.filesService.detectFile(
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
      const s3SubFolder =
        this.configService.get<string>('aws.s3SubFolder') || 'images';
      const keyName = `${s3SubFolder}/manga-${mangaId}/chapter-${chapterNumber}/lang-${f.languageId}/${f.fileName}`;
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
      uploadFiles.map((f) =>
        this.filesService.uploadToS3(f.key_name, f.upload_path),
      ),
    );
    if (
      uploadResult.filter((r) => r.$metadata.httpStatusCode === 200).length !==
      allowedFiles.length
    ) {
      throw Error(`upload failed - ${JSON.stringify(uploadResult)}`);
    }
    return uploadFiles;
  }
}

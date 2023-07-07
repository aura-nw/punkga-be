import { Injectable, Logger } from '@nestjs/common';

import * as _ from 'lodash';
import {
  ChapterImage,
  CreateChapterRequestDto,
} from './dto/create-chapter-request.dto';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import * as path from 'path';
import { ContextProvider } from '../providers/contex.provider';
import { IChapterLanguages, IFileInfo, IUploadedFile } from './interfaces';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { GraphqlService } from '../graphql/graphql.service';
import { FilesService } from '../files/files.service';

@Injectable()
export class ChapterService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private configService: ConfigService,
    private graphqlSvc: GraphqlService,
    private filesService: FilesService,
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

    const thumbnailFile = await this.filesService.detectFile(
      `./uploads/${userId}`,
      thumbnailFileName,
    );
    const thumbnailUrl = await this.filesService.uploadThumbnailToS3(
      manga_id,
      chapter_number,
      thumbnailFile,
    );

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

    const updateResult = await this.insertChapterLanguages(
      token,
      chapterId,
      chapterLanguages,
    );

    if (updateResult.errors && updateResult.errors.length > 0) {
      return updateResult;
    }

    return result.data;
  }

  async insertChapterLanguages(
    token: string,
    chapterId: number,
    data: {
      languageId: number;
      detail: string;
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

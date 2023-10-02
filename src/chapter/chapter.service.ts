import { Injectable, Logger } from '@nestjs/common';

import * as _ from 'lodash';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import rimraf from 'rimraf';
import md5 from 'md5';
import {
  ChapterImage,
  CreateChapterRequestDto,
} from './dto/create-chapter-request.dto';
import { ContextProvider } from '../providers/contex.provider';
import { GraphqlService } from '../graphql/graphql.service';
import { FilesService } from '../files/files.service';
import {
  ChapterLanguage,
  UpdateChapterImage,
  UpdateChapterParamDto,
  UpdateChapterRequestDto,
} from './dto/update-chapter-request.dto';
import { UploadInputDto } from './dto/upload.dto';
import { MangaService } from '../manga/manga.service';
import { ViewProtectedChapterRequestDto } from './dto/view-chapter-request.dto';
import { ChapterGraphql } from './chapter.graphql';
import { mkdirp } from './utils';
import { UploadChapterService } from './upload-chapter.service';

@Injectable()
export class ChapterService {
  private readonly logger = new Logger(ChapterService.name);

  constructor(
    private configService: ConfigService,
    private graphqlSvc: GraphqlService,
    private filesService: FilesService,
    private mangaService: MangaService,
    private chapterGraphql: ChapterGraphql,
    private uploadChapterService: UploadChapterService
  ) {}

  async upload(data: UploadInputDto, file: Express.Multer.File) {
    try {
      const { userId } = ContextProvider.getAuthUser();
      const { name, currentChunkIndex, totalChunks } = data;

      this.logger.debug(
        `uploading file ${name}: ${
          Number(currentChunkIndex) + 1
        }/${totalChunks}`
      );

      const firstChunk = parseInt(currentChunkIndex) === 0;
      const lastChunk =
        parseInt(currentChunkIndex) === parseInt(totalChunks) - 1;
      const ext = name.split('.').pop();

      const storageFolder = `./uploads/${userId}`;
      if (!existsSync(storageFolder)) {
        mkdirSync(storageFolder, { recursive: true });
      }

      const buffer = file.buffer;
      const tmpFilename = 'tmp_' + md5(name) + '.' + ext;
      const tmpFilepath = `${storageFolder}/${tmpFilename}`;
      if (firstChunk && existsSync(tmpFilepath)) {
        unlinkSync(tmpFilepath);
      }
      appendFileSync(tmpFilepath, buffer);

      if (lastChunk) {
        const finalFilePath = `${storageFolder}/${name}`;
        if (existsSync(finalFilePath)) unlinkSync(finalFilePath);
        renameSync(tmpFilepath, finalFilePath);
        return { finalFilename: name, path: finalFilePath };
      } else {
        return {
          success: true,
          tmpFilename,
          tmpFilepath,
        };
      }
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async create(
    data: CreateChapterRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
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
        JSON.parse(data.chapter_images)
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
        this.logger.debug(`uploading thumbnail ${thumbnail.originalname}`);
        const thumbnailFile = await this.filesService.detectFile(
          `./uploads/${userId}`,
          thumbnail.originalname
        );
        thumbnailUrl = await this.filesService.uploadThumbnailToS3(
          manga_id,
          chapter_number,
          thumbnailFile
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
        variables
      );

      if (result.errors && result.errors.length > 0) {
        return result;
      }

      const chapterId = result.data.insert_chapters_one.id;

      // upload chapter languages
      const uploadChapterResult =
        await this.uploadChapterService.uploadChapterLanguagesFiles({
          userId,
          mangaId: manga_id,
          chapterNumber: chapter_number,
          chapterImages: chapter_images.chapter_languages.map((m: any) => ({
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
          (chapter) => chapter.language_id
        );
        const chapterLanguages = chapter_images.chapter_languages.map((m) => ({
          languageId: m.language_id,
          detail: groupLanguageChapter[`${m.language_id}`].map((r) => ({
            order: r.order,
            image_path: r.image_path,
            name: r.name,
          })),
        }));

        const updateResult = await this.insertChapterLanguages(
          token,
          chapterId,
          chapterLanguages
        );

        if (updateResult.errors && updateResult.errors.length > 0) {
          return updateResult;
        }
      }

      // return {};
      return result.data;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async update(
    param: UpdateChapterParamDto,
    data: UpdateChapterRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
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

      const chapter_images = plainToInstance(
        UpdateChapterImage,
        JSON.parse(data.chapter_images)
      );

      // get chapter info
      const chapter = await this.chapterGraphql.getChapterInfo(
        token,
        chapter_id
      );
      const { manga_id, thumbnail_url, chapter_languages } = chapter;

      // create folder
      mkdirp(storageFolder);

      files.forEach((file) => {
        writeFileSync(`./uploads/${userId}/${file.originalname}`, file.buffer);
      });

      const newThumbnailUrl = await this.uploadChapterService.uploadThumbnail(
        files,
        userId,
        manga_id,
        chapter_number
      );

      // update chapter
      const variables = {
        id: chapter_id,
        chapter_name,
        chapter_number,
        chapter_type,
        pushlish_date,
        status,
        thumbnail_url: newThumbnailUrl !== '' ? newThumbnailUrl : thumbnail_url,
      };

      const result = await this.chapterGraphql.updateChapter(token, variables);

      if (result.errors && result.errors.length > 0) {
        return result;
      }

      // upload chapter languages
      const uploadChapterResult =
        await this.uploadChapterService.uploadChapterLanguagesFiles({
          userId,
          mangaId: manga_id,
          chapterNumber: chapter_number,
          chapterImages: chapter_images.chapter_languages.map(
            (chapterLanguage: ChapterLanguage) => ({
              languageId: chapterLanguage.language_id,
              filePath: path.join(storageFolder, chapterLanguage.file_name),
              addImages: chapterLanguage.add_images,
              deleteImages: chapterLanguage.delete_images,
            })
          ),
        });

      // remove files
      rimraf.sync(storageFolder);

      // add chapter

      const newChapterLanguages = chapter_languages.map(
        ({ language_id, detail }) => {
          const { add_images, delete_images } =
            chapter_images.chapter_languages.filter(
              (chapLang) => chapLang.language_id === language_id
            )[0];

          const newLanguageDetail = _.remove(detail, (image: any) =>
            delete_images.includes(image.name)
          );
          uploadChapterResult.filter((uploadResult) =>
            add_images.includes(uploadResult.name)
          );
          newLanguageDetail.push(
            ...uploadChapterResult
              .filter((uploadResult) => add_images.includes(uploadResult.name))
              .map((uploadResult) => ({
                order: uploadResult.order,
                image_path: uploadResult.image_path,
                name: uploadResult.name,
              }))
          );

          return {
            language_id,
            detail: newLanguageDetail,
          };
        }
      );

      // if (uploadChapterResult.length > 0) {
      //   // insert to DB
      //   const groupLanguageChapter = _.groupBy(
      //     uploadChapterResult,
      //     (chapter) => chapter.language_id
      //   );
      //   const chapterLanguages = chapter_images.chapter_languages.map((m) => ({
      //     languageId: m.language_id,
      //     detail: groupLanguageChapter[`${m.language_id}`].map((r) => ({
      //       order: r.order,
      //       image_path: r.image_path,
      //       name: r.name,
      //     })),
      //   }));

      const updateChapterLangResult = await Promise.all(
        this.chapterGraphql.updateChapterLanguages(
          token,
          chapter_id,
          newChapterLanguages
        )
      );
      this.logger.log(updateChapterLangResult);
      // }

      return result.data;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async view(data: ViewProtectedChapterRequestDto) {
    try {
      const { token } = ContextProvider.getAuthUser();

      const { chapterId } = data;

      // insert chapter to DB
      const result = await this.graphqlSvc.query(
        this.configService.get<string>('graphql.endpoint'),
        token,
        `query GetMangaIdByChapterId($id: Int = 10) {
          chapters(where: {id: {_eq: $id}}) {
            manga_id
            chapter_type
            chapter_languages(where: {chapter: {status: {_eq: "Published"}}}) {
              language_id
              detail
            }
          }
        }`,
        'GetMangaIdByChapterId',
        {
          id: chapterId,
        }
      );

      if (result.errors && result.errors.length > 0) {
        return result;
      }

      if (result.data.chapters[0].chapter_type === 'NFTs only') {
        const access = await this.mangaService.getAccess(
          result.data.chapters[0].manga_id
        );

        this.logger.debug(`Access ${JSON.stringify(access)}`);

        if (!access.nft || access.nft !== true) {
          result.data.chapters[0].chapter_languages = [];
        }
      }

      return result;
    } catch (errors) {
      this.logger.error(errors);
      return {
        errors,
      };
    }
  }

  async insertChapterLanguages(
    token: string,
    chapterId: number,
    data: {
      languageId: number;
      detail: any;
    }[]
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
      variables
    );
  }
}

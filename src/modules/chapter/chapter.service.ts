import { plainToInstance } from 'class-transformer';
import { appendFileSync, existsSync, renameSync, unlinkSync } from 'fs';
import * as _ from 'lodash';
import md5 from 'md5';
import rimraf from 'rimraf';

import { Injectable, Logger } from '@nestjs/common';

import { ContextProvider } from '../../providers/contex.provider';
import { MangaService } from '../manga/manga.service';
import { ChapterGraphql } from './chapter.graphql';
import {
  ChapterImage,
  CreateChapterRequestDto,
} from './dto/create-chapter-request.dto';
import {
  UpdateChapterImage,
  UpdateChapterParamDto,
  UpdateChapterRequestDto,
} from './dto/update-chapter-request.dto';
import { UploadInputDto } from './dto/upload.dto';
import { ViewProtectedChapterRequestDto } from './dto/view-chapter-request.dto';
import { UploadChapterService } from './upload-chapter.service';
import { mkdirp, writeFilesToFolder } from './utils';

@Injectable()
export class ChapterService {
  private readonly logger = new Logger(ChapterService.name);

  constructor(
    private mangaService: MangaService,
    private chapterGraphql: ChapterGraphql,
    private uploadChapterService: UploadChapterService
  ) { }

  async upload(data: UploadInputDto, file: Express.Multer.File) {
    try {
      const { userId } = ContextProvider.getAuthUser();
      const { name, currentChunkIndex, totalChunks } = data;

      this.logger.debug(
        `uploading file ${name}: ${Number(currentChunkIndex) + 1
        }/${totalChunks}`
      );

      const firstChunk = currentChunkIndex === 0;
      const lastChunk = currentChunkIndex === totalChunks - 1;

      const storageFolder = `./uploads/${userId}`;
      mkdirp(storageFolder);

      const ext = name.split('.').pop();
      const tmpFilename = 'tmp_' + md5(name) + '.' + ext;
      const tmpFilepath = `${storageFolder}/${tmpFilename}`;
      if (firstChunk && existsSync(tmpFilepath)) {
        unlinkSync(tmpFilepath);
      }

      const buffer = file.buffer;
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

      writeFilesToFolder(files, storageFolder);

      const newThumbnailUrl = await this.uploadChapterService.uploadThumbnail(
        files,
        userId,
        manga_id,
        chapter_number
      );

      // insert chapter to DB
      const result = await this.chapterGraphql.createChapter(token, {
        manga_id,
        chapter_name,
        chapter_number,
        chapter_type,
        pushlish_date,
        status,
        thumbnail_url: newThumbnailUrl,
      });

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
          storageFolder,
          chapterImages: chapter_images,
        });

      // remove files
      // rimraf.sync(storageFolder);

      // insert to DB
      if (uploadChapterResult.length > 0) {
        const groupLanguageChapter = _.groupBy(
          uploadChapterResult,
          (chapter) => chapter.language_id
        );
        const chapterLanguages = chapter_images.chapter_languages
          .filter((chapter_language) => Object.keys(groupLanguageChapter).includes(chapter_language.language_id.toString()))
          .map((m) => ({
            languageId: m.language_id,
            detail: groupLanguageChapter[`${m.language_id}`].map((r) => ({
              order: r.order,
              image_path: r.image_path,
              name: r.name,
            })),
          }));

        const updateResult =
          await this.chapterGraphql.insertUpdateChapterLanguages(
            token,
            chapterId,
            chapterLanguages
          );

        if (updateResult.errors && updateResult.errors.length > 0) {
          return updateResult;
        }
      }

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

      // get chapter info
      const chapter = await this.chapterGraphql.getChapterInfo(
        token,
        chapter_id
      );
      const { manga_id, thumbnail_url, chapter_languages: current_chapter_languages } = chapter;

      // create folder
      writeFilesToFolder(files, storageFolder);

      const newThumbnailUrl = await this.uploadChapterService.uploadThumbnail(
        files,
        userId,
        manga_id,
        chapter_number
      );

      // update chapter
      const result = await this.chapterGraphql.updateChapter(token, {
        id: chapter_id,
        chapter_name,
        chapter_number,
        chapter_type,
        pushlish_date,
        status,
        thumbnail_url: newThumbnailUrl !== '' ? newThumbnailUrl : thumbnail_url,
      });

      if (result.errors && result.errors.length > 0) {
        return result;
      }

      // update chapter images by language
      const input_chapter_images = plainToInstance(
        UpdateChapterImage,
        JSON.parse(data.chapter_images)
      );

      // upload chapter languages
      const uploadChapterResult =
        await this.uploadChapterService.uploadChapterLanguagesFiles({
          userId,
          mangaId: manga_id,
          chapterNumber: chapter_number,
          storageFolder,
          chapterImages: input_chapter_images,
        });

      // remove files
      // rimraf.sync(storageFolder);

      const newChapterLanguages = input_chapter_images.chapter_languages.map(({ add_images, delete_images, language_id }) => {
        const [existingLanguageData] = current_chapter_languages.filter((chapter_language) => chapter_language.language_id === language_id);

        if (existingLanguageData) {
          // remove images
          _.remove(existingLanguageData, (image: any) => delete_images.includes(image.name));

          // add images without duplicate
          uploadChapterResult
            .filter((uploadResult) =>
              // by languages
              uploadResult.language_id === existingLanguageData.language_id
              // images already uploaded
              && add_images.includes(uploadResult.name)
              // and unique
              && !existingLanguageData.detail.some((item) => item.name === uploadResult.name))
            .forEach((uploadResult) => {
              // push new data to existing data
              existingLanguageData.detail.push({
                order: uploadResult.order,
                image_path: uploadResult.image_path,
                name: uploadResult.name,
              });
            });

          return {
            languageId: language_id,
            detail: existingLanguageData.detail.sort((a, b) => a.order - b.order),
          };
        } else {
          const newLanguageData = {
            languageId: language_id,
            detail: []
          }
          // add images already uploaded
          uploadChapterResult.filter((uploadResult) => add_images.includes(uploadResult.name))
            .forEach((uploadResult) => {
              // push new data
              newLanguageData.detail.push({
                order: uploadResult.order,
                image_path: uploadResult.image_path,
                name: uploadResult.name,
              });
            });

          return newLanguageData;
        }
      });

      // console.log(JSON.stringify(newChapterLanguages))
      // build new chapter languages for existing languages
      // const newChapterLanguages = current_chapter_languages.map(
      //   ({ language_id, detail }) => {
      //     const { add_images, delete_images } =
      //       input_chapter_images.chapter_languages.filter(
      //         (chapLang) => chapLang.language_id === language_id
      //       )[0];

      //     _.remove(detail, (image: any) => delete_images.includes(image.name));

      //     uploadChapterResult
      //       .filter((uploadResult) => add_images.includes(uploadResult.name))
      //       .forEach((uploadResult) => {
      //         const isNameExists = detail.some(
      //           (item) => item.name === uploadResult.name
      //         );
      //         if (!isNameExists) {
      //           detail.push({
      //             order: uploadResult.order,
      //             image_path: uploadResult.image_path,
      //             name: uploadResult.name,
      //           });
      //         }
      //       });

      //     return {
      //       languageId: language_id,
      //       detail: detail.sort((a, b) => a.order - b.order),
      //     };
      //   }
      // );

      // update data
      const updateChapterLangResult =
        await this.chapterGraphql.insertUpdateChapterLanguages(
          token,
          chapter_id,
          newChapterLanguages
        );
      this.logger.log(updateChapterLangResult);

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

      // query manga info
      const result = await this.chapterGraphql.getMangaIdByChapterId(
        token,
        chapterId
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
}

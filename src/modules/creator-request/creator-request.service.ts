import { Injectable } from '@nestjs/common';
import { CreatorRequestGraphql } from './creator-request.graphql';
import { ContextProvider } from '../../providers/contex.provider';
import {
  ChapterStatus,
  CreatorRequestStatus,
  CreatorRequestType,
  MangaStatus,
} from '../../common/enum';
import { MangaService } from '../../modules/manga/manga.service';
// import { MangaGraphql } from '../../modules/manga/manga.graphql';
import {
  CreatorCreateMangaRequestDto,
  CreatorUpdateMangaRequestDto,
} from './dto/creator-create-manga-request.dto';
import { CreateMangaRequestDto } from '../../modules/manga/dto/create-manga-request.dto';
import { MangaGraphql } from '../../modules/manga/manga.graphql';
import { CreatorCreateChapterRequestDto } from './dto/creator-create-chapter-request.dto';
import { CreateChapterRequestDto } from '../../modules/chapter/dto/create-chapter-request.dto';
import { ChapterService } from '../../modules/chapter/chapter.service';
import {
  CreatorUpdateChapterParamDto,
  CreatorUpdateChapterRequestDto,
} from './dto/creator-update-chapter-request.dto';
import {
  UpdateChapterParamDto,
  UpdateChapterRequestDto,
} from '../../modules/chapter/dto/update-chapter-request.dto';

@Injectable()
export class CreatorRequestService {
  constructor(
    private requestGraphql: CreatorRequestGraphql,
    private mangaSvc: MangaService, // private mangaGraphql: MangaGraphql
    private chapterSvc: ChapterService, // private mangaGraphql: MangaGraphql
    private mangaGraphql: MangaGraphql
  ) {}

  async createMangaRequest(
    params: CreatorCreateMangaRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const { token } = ContextProvider.getAuthUser();
      const {
        requestor_id,
        manga_tags,
        manga_creators,
        manga_languages,
        release_date,
        banner,
        poster,
      } = params;
      const data: CreateMangaRequestDto = {
        manga_tags,
        manga_creators,
        manga_languages,
        release_date,
        banner,
        poster,
        status: MangaStatus.OnRequest,
      };
      const createMangaResponse = await this.mangaSvc.create(data, files);
      if (createMangaResponse.errors && createMangaResponse.errors.length > 0) {
        return createMangaResponse;
      }
      const object = {
        creator_id: requestor_id,
        data: createMangaResponse.data.update_manga_by_pk,
        type: CreatorRequestType.CREATE_NEW_MANGA,
        manga_id: createMangaResponse.data.update_manga_by_pk.id,
        status: CreatorRequestStatus.SUBMITED,
      };
      const createRequestResponse =
        await this.requestGraphql.createNewCreatorRequest(token, { object });

      return createRequestResponse;
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async updateMangaRequest(
    manga_id: number,
    params: CreatorUpdateMangaRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const {
        requestor_id,
        manga_tags,
        manga_creators,
        manga_languages,
        release_date,
        banner,
        poster,
      } = params;
      const data: CreateMangaRequestDto = {
        manga_tags,
        manga_creators,
        manga_languages,
        release_date,
        banner,
        poster,
        status: MangaStatus.OnRequest,
      };

      const { token } = ContextProvider.getAuthUser();
      const result = await this.mangaGraphql.queryMangaById(token, {
        id: manga_id,
      });

      if (result.errors && result.errors.length > 0) {
        return result;
      }

      if (!result.manga_by_pk) {
        return {
          errors: {
            message: 'Manga can not found',
          },
        };
      }

      const updateMangaObj = await this.mangaSvc.buildObjToUpdate(
        manga_id,
        data,
        files
      );
      if (updateMangaObj.errors && updateMangaObj.errors.length > 0) {
        return updateMangaObj;
      }
      const object = {
        creator_id: requestor_id,
        data: updateMangaObj,
        type: CreatorRequestType.UPDATE_MANGA,
        manga_id,
        status: CreatorRequestStatus.SUBMITED,
      };
      const createRequestResponse =
        await this.requestGraphql.createNewCreatorRequest(token, { object });

      return createRequestResponse;
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async createChapterRequest(
    params: CreatorCreateChapterRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const { token } = ContextProvider.getAuthUser();
      const {
        requestor_id,
        chapter_number,
        manga_id,
        chapter_name,
        chapter_type,
        pushlish_date,
        collection_ids,
        chapter_images,
        thumbnail,
      } = params;
      const data: CreateChapterRequestDto = {
        chapter_number,
        manga_id,
        chapter_name,
        chapter_type,
        pushlish_date,
        collection_ids,
        status: ChapterStatus.OnRequest,
        chapter_images,
        thumbnail,
        files,
      };
      const createChapterResponse = await this.chapterSvc.create(data, files);
      if (
        createChapterResponse.errors &&
        createChapterResponse.errors.length > 0
      ) {
        return createChapterResponse;
      }
      const object = {
        creator_id: requestor_id,
        data: createChapterResponse.insert_chapters_one,
        type: CreatorRequestType.CREATE_NEW_CHAPTER,
        manga_id,
        status: CreatorRequestStatus.SUBMITED,
      };
      const createRequestResponse =
        await this.requestGraphql.createNewCreatorRequest(token, { object });

      return createRequestResponse;
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async updateChapterRequest(
    param: UpdateChapterParamDto,
    data: CreatorUpdateChapterRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const { token } = ContextProvider.getAuthUser();
      const {
        requestor_id,
        manga_id,
        chapter_number,
        chapter_name,
        chapter_type,
        pushlish_date,
        collection_ids,
        thumbnail,
        chapter_images,
      } = data;
      const dataInput: UpdateChapterRequestDto = {
        chapter_name,
        chapter_number,
        chapter_type,
        chapter_images,
        pushlish_date,
        status: ChapterStatus.OnRequest,
        thumbnail,
        files,
        collection_ids,
      };
      const updateChapterData =
        await this.chapterSvc.buildChapterObjToUpdate(param, dataInput, files);
      if (
        updateChapterData.errors
      ) {
        return {
          errors: {
            message: 'Build Update data failed',
          },
        };
      }
      const object = {
        creator_id: requestor_id,
        data: updateChapterData,
        type: CreatorRequestType.UPDATE_CHAPTER,
        manga_id,
        status: CreatorRequestStatus.SUBMITED,
      };
      const createRequestResponse =
        await this.requestGraphql.createNewCreatorRequest(token, { object });

      return createRequestResponse;
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }
}

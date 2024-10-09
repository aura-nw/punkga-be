import { Injectable } from '@nestjs/common';
import { CreatorRequestGraphql } from './creator-request.graphql';
import { ContextProvider } from '../../providers/contex.provider';
import {
  AdminResponse,
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
import { UpdateMangaRequestDto } from '../../modules/manga/dto/update-manga-request.dto';
import { ChapterGraphql } from '../../modules/chapter/chapter.graphql';
import { AdminResponseRequest } from './dto/admin-response-request.dto';

@Injectable()
export class CreatorRequestService {
  constructor(
    private requestGraphql: CreatorRequestGraphql,
    private mangaSvc: MangaService,
    private chapterSvc: ChapterService,
    private mangaGraphql: MangaGraphql,
    private chapterGraphql: ChapterGraphql
  ) {}

  async createMangaRequest(
    params: CreatorCreateMangaRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const {
        requestor_id,
        manga_tags,
        manga_creators,
        manga_languages,
        // release_date,
        banner,
        poster,
        finished,
        age_limit,
      } = params;
      const data: CreateMangaRequestDto = {
        manga_tags,
        manga_creators,
        manga_languages,
        release_date: null,
        banner,
        poster,
        status: MangaStatus.OnRequest,
        finished,
        age_limit,
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
        status: CreatorRequestStatus.SUBMITTED,
      };
      return this.requestGraphql.adminCreateNewCreatorRequest({ object });
      // if (
      //   createRequestResponse.errors &&
      //   createRequestResponse.errors.length > 0
      // ) {
      //   return createRequestResponse;
      // }
      // return createRequestResponse;
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
        // release_date,
        banner,
        poster,
        finished,
        age_limit,
      } = params;
      const data: UpdateMangaRequestDto = {
        manga_tags,
        manga_creators,
        manga_languages,
        release_date: '',
        banner,
        poster,
        status: MangaStatus.OnRequest,
        finished,
        age_limit,
      };

      const { token } = ContextProvider.getAuthUser();
      const result = await this.mangaGraphql.queryMangaById(token, {
        id: manga_id,
      });

      if (result.errors && result.errors.length > 0) {
        return result;
      }

      if (!result.data.manga_by_pk) {
        throw new Error('Manga can not found');
      }

      if (MangaStatus.OnRequest == result.data.manga_by_pk.status) {
        throw new Error('Can not edit Manga is on-requesting');
      }
      data.status = result.data.manga_by_pk.status;

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
        status: CreatorRequestStatus.SUBMITTED,
      };
      return this.requestGraphql.adminCreateNewCreatorRequest({ object });

      // return createRequestResponse;
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

      const { token } = ContextProvider.getAuthUser();
      const result = await this.mangaGraphql.queryMangaById(token, {
        id: manga_id,
      });

      if (result.errors && result.errors.length > 0) {
        return result;
      }
      if (!result.data.manga_by_pk) {
        throw new Error('Manga can not found');
      }

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
        chapter_id: createChapterResponse.insert_chapters_one.id,
        status: CreatorRequestStatus.SUBMITTED,
      };
      return this.requestGraphql.adminCreateNewCreatorRequest({ object });
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
        status,
      } = data;

      // validate
      const { token } = ContextProvider.getAuthUser();
      const result = await this.mangaGraphql.queryMangaById(token, {
        id: manga_id,
      });

      if (result.errors && result.errors.length > 0) {
        return result;
      }
      if (!result.data.manga_by_pk) {
        throw new Error('Manga can not found');
      }

      const dataInput: UpdateChapterRequestDto = {
        chapter_name,
        chapter_number,
        chapter_type,
        chapter_images,
        pushlish_date,
        status,
        thumbnail,
        files,
        collection_ids,
      };

      const updateChapterData = await this.chapterSvc.buildChapterObjToUpdate(
        param,
        dataInput,
        files
      );
      if (updateChapterData.errors) {
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
        chapter_id: param.chapterId,
        status: CreatorRequestStatus.SUBMITTED,
      };
      return this.requestGraphql.adminCreateNewCreatorRequest({ object });
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async getRequestByCreatorAndStatus(creator_id: number, status: string) {
    try {
      const result =
        await this.requestGraphql.getCreatorRequestByCreatorAndStatus(
          creator_id,
          status
        );

      return result;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async resubmitCreateMangaRequest(
    request_id: number,
    params: CreatorCreateMangaRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const {
        requestor_id,
        manga_tags,
        manga_creators,
        manga_languages,
        // release_date,
        banner,
        poster,
        finished,
        age_limit,
      } = params;
      const requestInfo = await this.requestGraphql.getCreatorRequestByPK(
        request_id
      );

      if (requestInfo.errors && requestInfo.errors.length > 0) {
        return requestInfo;
      }

      if (!requestInfo.data.creator_request_by_pk) {
        throw new Error('Request can not found');
      }

      if (
        CreatorRequestStatus.REJECTED !=
        requestInfo.data.creator_request_by_pk.status
      ) {
        throw new Error('Request is not Rejected');
      }

      const { manga_id } = requestInfo.data.creator_request_by_pk;
      const data: UpdateMangaRequestDto = {
        manga_tags,
        manga_creators,
        manga_languages,
        release_date: '',
        banner,
        poster,
        status: MangaStatus.OnRequest,
        finished,
        age_limit,
      };
      const updateMangaResponse = await this.mangaSvc.update(
        manga_id,
        data,
        files
      );
      if (updateMangaResponse.errors && updateMangaResponse.errors.length > 0) {
        return updateMangaResponse;
      }
      const object = {
        creator_id: requestor_id,
        data: updateMangaResponse.data.insert_manga_one,
        type: CreatorRequestType.CREATE_NEW_MANGA,
        manga_id,
        status: CreatorRequestStatus.RE_SUBMITTED,
      };
      return this.requestGraphql.adminUpdateCreatorRequestByPK(
        request_id,
        object
      );
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async resubmitCreateChapterRequest(
    request_id: number,
    params: CreatorUpdateChapterRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
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
      } = params;
      const data: UpdateChapterRequestDto = {
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
      const requestInfo = await this.requestGraphql.getCreatorRequestByPK(
        request_id
      );

      if (requestInfo.errors && requestInfo.errors.length > 0) {
        return requestInfo;
      }

      if (!requestInfo.data.creator_request_by_pk) {
        throw new Error('Request can not found');
      }
      if (
        CreatorRequestStatus.REJECTED !=
        requestInfo.data.creator_request_by_pk.status
      ) {
        throw new Error('Request is not Rejected');
      }
      const chapterId = requestInfo.data.creator_request_by_pk.data.id;
      const { chapter, chapterLanguage } =
        await this.chapterSvc.buildChapterObjToUpdate(
          { chapterId },
          data,
          files
        );
      if (!chapter || !chapterLanguage) {
        throw new Error('can not build chapter infor for update');
      }
      // update chapter
      const updateChapter = await this.chapterGraphql.adminUpdateChapter(
        chapter
      );
      if (updateChapter.errors && updateChapter.errors.length > 0) {
        return updateChapter;
      }
      const updateChapterLangResult =
        await this.chapterGraphql.adminInsertUpdateChapterLanguages(
          chapterId,
          chapterLanguage
        );

      if (
        updateChapterLangResult.errors &&
        updateChapterLangResult.errors.length > 0
      ) {
        return updateChapterLangResult;
      }

      const object = {
        creator_id: requestor_id,
        data: updateChapter.data.update_chapters_by_pk,
        type: CreatorRequestType.CREATE_NEW_CHAPTER,
        manga_id,
        chapter_id: chapterId,
        status: CreatorRequestStatus.RE_SUBMITTED,
      };
      return this.requestGraphql.adminUpdateCreatorRequestByPK(
        request_id,
        object
      );
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async resubmitUpdateMangaRequest(
    request_id: number,
    params: CreatorUpdateMangaRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const {
        requestor_id,
        manga_tags,
        manga_creators,
        manga_languages,
        // release_date,
        banner,
        poster,
        finished,
        age_limit,
      } = params;

      const requestInfo = await this.requestGraphql.getCreatorRequestByPK(
        request_id
      );

      if (requestInfo.errors && requestInfo.errors.length > 0) {
        return requestInfo;
      }

      if (!requestInfo.data.creator_request_by_pk) {
        throw new Error('Request can not found');
      }
      if (
        CreatorRequestStatus.REJECTED !=
        requestInfo.data.creator_request_by_pk.status
      ) {
        throw new Error('Request is not Rejected');
      }

      const data: UpdateMangaRequestDto = {
        manga_tags,
        manga_creators,
        manga_languages,
        release_date: '',
        banner,
        poster,
        status: MangaStatus.OnRequest,
        finished,
        age_limit,
      };

      const { token } = ContextProvider.getAuthUser();
      const { manga_id } = requestInfo.data.creator_request_by_pk;
      const result = await this.mangaGraphql.queryMangaById(token, {
        id: manga_id,
      });

      if (result.errors && result.errors.length > 0) {
        return result;
      }

      if (!result.data.manga_by_pk) {
        return {
          errors: {
            message: 'Manga can not found',
          },
        };
      }
      if (MangaStatus.OnRequest == result.data.manga_by_pk.status) {
        throw new Error('Can not edit Manga is on-requesting');
      }
      data.status = result.data.manga_by_pk.status;

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
        status: CreatorRequestStatus.RE_SUBMITTED,
      };
      return this.requestGraphql.adminUpdateCreatorRequestByPK(
        request_id,
        object
      );
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async resubmitUpdateChapterRequest(
    request_id: number,
    data: CreatorUpdateChapterRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
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
        status,
      } = data;

      const requestInfo = await this.requestGraphql.getCreatorRequestByPK(
        request_id
      );

      if (requestInfo.errors && requestInfo.errors.length > 0) {
        return requestInfo;
      }

      if (!requestInfo.data.creator_request_by_pk) {
        throw new Error('Request can not found');
      }

      if (
        CreatorRequestStatus.REJECTED !=
        requestInfo.data.creator_request_by_pk.status
      ) {
        throw new Error('Request is not Rejected');
      }

      const dataInput: UpdateChapterRequestDto = {
        chapter_name,
        chapter_number,
        chapter_type,
        chapter_images,
        pushlish_date,
        status,
        thumbnail,
        files,
        collection_ids,
      };
      const chapter_id = requestInfo.data.creator_request_by_pk.chapter_id;
      const updateChapterData = await this.chapterSvc.buildChapterObjToUpdate(
        { chapterId: chapter_id },
        dataInput,
        files
      );
      if (updateChapterData.errors) {
        throw new Error('Build Update data failed');
      }
      const object = {
        creator_id: requestor_id,
        data: updateChapterData,
        type: CreatorRequestType.UPDATE_CHAPTER,
        manga_id,
        chapter_id,
        status: CreatorRequestStatus.RE_SUBMITTED,
      };
      return this.requestGraphql.adminUpdateCreatorRequestByPK(
        request_id,
        object
      );
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async adminResponseRequest(data: AdminResponseRequest) {
    try {
      const { request_id, adminResponse, adminNote } = data;

      const requestInfo = await this.requestGraphql.getCreatorRequestByPK(
        request_id
      );

      if (requestInfo.errors && requestInfo.errors.length > 0) {
        return requestInfo;
      }

      if (!requestInfo.data.creator_request_by_pk) {
        throw new Error('Request can not found');
      }
      if (
        CreatorRequestStatus.SUBMITTED !=
          requestInfo.data.creator_request_by_pk.status &&
        CreatorRequestStatus.RE_SUBMITTED !=
          requestInfo.data.creator_request_by_pk.status
      ) {
        throw new Error('Request is not submitted');
      }

      let object = {};
      if (AdminResponse.REJECTED == adminResponse) {
        const { type, manga_id, chapter_id } =
          requestInfo.data.creator_request_by_pk;
        switch (type) {
          case CreatorRequestType.CREATE_NEW_MANGA: {
            const rs = await this._rejectCreateNewManga(manga_id);
            if (rs.errors && rs.errors.length > 0) {
              return rs;
            }
            break;
          }
          case CreatorRequestType.CREATE_NEW_CHAPTER: {
            const rs = await this._rejectCreateChapter(chapter_id);
            if (rs.errors && rs.errors.length > 0) {
              return rs;
            }
            break;
          }
        }
        object = {
          status: CreatorRequestStatus.REJECTED,
          admin_note: adminNote,
        };
      } else if (AdminResponse.APPROVED == adminResponse) {
        const { type, data, manga_id, chapter_id } =
          requestInfo.data.creator_request_by_pk;
        switch (type) {
          case CreatorRequestType.CREATE_NEW_MANGA: {
            const rs = await this._approveCreateNewManga(manga_id);
            if (rs.errors && rs.errors.length > 0) {
              return rs;
            }
            break;
          }
          case CreatorRequestType.UPDATE_MANGA: {
            const rs = await this._approveUpdateManga(data);
            if (rs.errors && rs.errors.length > 0) {
              return rs;
            }
            break;
          }
          case CreatorRequestType.CREATE_NEW_CHAPTER: {
            const rs = await this._approveCreateChapter(chapter_id);
            if (rs.errors && rs.errors.length > 0) {
              return rs;
            }
            break;
          }
          case CreatorRequestType.UPDATE_CHAPTER: {
            const rs = await this._approveUpdateChapter(chapter_id, data);
            if (rs.errors && rs.errors.length > 0) {
              return rs;
            }
            break;
          }
        }
        object = {
          status: CreatorRequestStatus.APPROVED,
          admin_note: adminNote,
        };
      }

      return this.requestGraphql.adminUpdateCreatorRequestByPK(
        request_id,
        object
      );
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async _approveCreateNewManga(mangaId: number) {
    return this.mangaGraphql.updateMangaStatus(mangaId, MangaStatus.Upcoming);
  }

  async _approveUpdateManga(manga: any) {
    return this.mangaGraphql.adminUpdateManga(manga);
  }

  async _approveCreateChapter(chapterId: number) {
    return this.chapterGraphql.updateChapterStatus(
      chapterId,
      ChapterStatus.Published
    );
  }

  async _approveUpdateChapter(chapter_id: number, chaperInfo: any) {
    // update chapter
    const result = await this.chapterGraphql.adminUpdateChapter(
      chaperInfo.chapter
    );
    if (result.errors && result.errors.length > 0) {
      return result;
    }
    return this.chapterGraphql.adminInsertUpdateChapterLanguages(
      chapter_id,
      chaperInfo.chapterLanguage
    );
  }

  async _rejectCreateNewManga(mangaId: number) {
    return this.mangaGraphql.updateMangaStatus(mangaId, MangaStatus.Rejected);
  }

  // async _rejectUpdateManga(manga: any) {
  //   return this.mangaGraphql.adminUpdateManga(manga);
  // }

  async _rejectCreateChapter(chapterId: number) {
    return this.chapterGraphql.updateChapterStatus(
      chapterId,
      ChapterStatus.Rejected
    );
  }

  // async _rejectUpdateChapter(chapter_id: number, chaperInfo: any) {
  //   // update chapter
  //   const result = await this.chapterGraphql.adminUpdateChapter(
  //     chaperInfo.chapter
  //   );
  //   if (result.errors && result.errors.length > 0) {
  //     return result;
  //   }
  //   return this.chapterGraphql.adminInsertUpdateChapterLanguages(
  //     chapter_id,
  //     chaperInfo.chapterLanguage
  //   );
  // }
}

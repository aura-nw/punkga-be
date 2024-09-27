import { Injectable } from '@nestjs/common';
import { CreatorRequestGraphql } from './creator-request.graphql';
import { ContextProvider } from '../../providers/contex.provider';
import {
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

@Injectable()
export class CreatorRequestService {
  constructor(
    private requestGraphql: CreatorRequestGraphql,
    private mangaSvc: MangaService, // private mangaGraphql: MangaGraphql
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
        return  {
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
}

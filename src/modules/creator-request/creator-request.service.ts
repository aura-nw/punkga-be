import { Injectable } from '@nestjs/common';
import { CreatorRequestGraphql } from './creator-request.graphql';
import { ContextProvider } from '../../providers/contex.provider';
import { CreatorRequestStatus, CreatorRequestType, MangaStatus } from '../../common/enum';
import { MangaService } from '../../modules/manga/manga.service';
// import { MangaGraphql } from '../../modules/manga/manga.graphql';
import { CreatorCreateMangaRequestDto } from './dto/creator-create-manga-request.dto';
import { CreateMangaRequestDto } from '../../modules/manga/dto/create-manga-request.dto';

@Injectable()
export class CreatorRequestService {
  constructor(
    private requestGraphql: CreatorRequestGraphql,
    private mangaSvc: MangaService // private mangaGraphql: MangaGraphql
  ) {}

  async createRequest(
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
}

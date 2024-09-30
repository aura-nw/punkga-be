import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import {
  CreateMangaRequestDto,
  MangaCreator,
  MangaLanguage,
  MangaTag,
} from './dto/create-manga-request.dto';
import { ContextProvider } from '../../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { UpdateMangaRequestDto } from './dto/update-manga-request.dto';
import { generateSlug } from './util';
import { detectSlugOrId } from '../../utils/utils';
import { GetChapterByMangaParamDto } from './dto/get-chapter-by-manga-request.dto';
import { MangaGraphql } from './manga.graphql';
import { errorOrEmpty } from '../graphql/utils';
import { CreatorService } from '../creator/creator.service';

@Injectable()
export class MangaService {
  private readonly logger = new Logger(MangaService.name);

  constructor(
    private configSvc: ConfigService,
    private filesService: FilesService,
    private creatorService: CreatorService,
    private mangaGraphql: MangaGraphql
  ) {}

  async get(slug: string, user_id = '') {
    try {
      const { id, slug: mangaSlug } = detectSlugOrId(slug);

      const result = await this.mangaGraphql.queryMangaByIdOrSlug({
        id,
        slug: mangaSlug,
        user_id,
      });

      return result;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async getChapterByManga(param: GetChapterByMangaParamDto, user_id: string) {
    try {
      const { slug, chapter_number } = param;
      const { id: mangaId, slug: mangaSlug } = detectSlugOrId(slug);

      const result = await this.mangaGraphql.getChapterReadingDetail({
        manga_slug: mangaSlug,
        manga_id: mangaId,
        chapter_number,
        user_id,
      });

      return result;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async create(data: CreateMangaRequestDto, files: Array<Express.Multer.File>) {
    try {
      const { token } = ContextProvider.getAuthUser();
      const { status, release_date } = data;
      const manga_tags = plainToInstance(
        MangaTag,
        JSON.parse(data.manga_tags) as any[]
      );
      const manga_creators = plainToInstance(
        MangaCreator,
        JSON.parse(data.manga_creators) as any[]
      );
      const manga_languages = plainToInstance(
        MangaLanguage,
        JSON.parse(data.manga_languages) as any[]
      );

      // insert manga to DB
      const result = await this.mangaGraphql.adminCreateNewManga({
        status,
        manga_tags,
        manga_creators,
        manga_languages,
        release_date,
        contract_addresses: [],
      });

      if (result.errors && result.errors.length > 0) {
        return result;
      }

      // upload files
      const mangaId = result.data.insert_manga_one.id;
      let posterUrl = '';
      let bannerUrl = '';
      const bannerFile = files.filter((f) => f.fieldname === 'banner')[0];
      if (bannerFile)
        bannerUrl = await this.filesService.uploadImageToS3(
          `manga-${mangaId}`,
          bannerFile
        );

      const posterFile = files.filter((f) => f.fieldname === 'poster')[0];
      if (bannerFile)
        posterUrl = await this.filesService.uploadImageToS3(
          `manga-${mangaId}`,
          posterFile
        );

      const slug = generateSlug(
        manga_languages.filter(
          (language) => language.is_main_language === true
        )[0].title,
        mangaId
      );

      // update manga in DB
      const updateResponse = await this.mangaGraphql.adminUpdateManga(
        {
          id: mangaId,
          banner: bannerUrl,
          poster: posterUrl,
          slug,
        }
      );

      return updateResponse;
    } catch (error) {
      return {
        errors: {
          message: error.message,
        },
      };
    }
  }

  async update(
    mangaId: number,
    data: UpdateMangaRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const updateManga = await this.buildObjToUpdate(mangaId, data, files);
      // update manga in DB
      const updateResponse = await this.mangaGraphql.adminUpdateManga(
        updateManga
      );

      return updateResponse;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async getAccess(mangaId: number) {
    try {
      const network = this.configSvc.get<string>('horosope.network');
      let nft = false;
      const { token } = ContextProvider.getAuthUser();
      const walletAddress = await this.mangaGraphql.queryUserAddress(token);

      if (walletAddress === null)
        return {
          nft,
        };

      // get contract_addresses
      const queryMangaResult = await this.mangaGraphql.queryMangaContractAddr(
        token,
        {
          id: mangaId,
        }
      );

      if (errorOrEmpty(queryMangaResult, 'manga_by_pk')) {
        return queryMangaResult;
      }

      const contract_addresses =
        queryMangaResult.data.manga_by_pk.contract_addresses;

      // check data on horoscope
      const getCw721TokenResult = await this.mangaGraphql.queryErc721Tokens(
        token,
        network,
        {
          smart_contracts: contract_addresses.map((address) =>
            address.toLowerCase()
          ),
          owner: walletAddress.toLowerCase(),
        }
      );

      if (
        getCw721TokenResult.data[`${network}`].erc721_contract.length > 0 &&
        getCw721TokenResult.data[`${network}`].erc721_contract.find(
          (contract) => contract.erc721_tokens.length > 0
        )
      ) {
        nft = true;
      }

      return {
        nft,
      };
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async addMangaCollection(mangaId: number, collectionIdList: number[]) {
    try {
      // const { token } = ContextProvider.getAuthUser();
      const objects = [];
      // update manga collection in DB
      await Promise.all(
        collectionIdList.map((collectionId) => {
          const o = {
            manga_id: mangaId,
            launchpad_id: collectionId,
          };
          objects.push(o);
        })
      );
      const updateResponse = await this.mangaGraphql.adminCreateMangaCollection(
        {
          objects,
        }
      );

      return updateResponse;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async buildObjToUpdate(
    mangaId: number,
    data: UpdateMangaRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const { token } = ContextProvider.getAuthUser();
      const {
        status,
        release_date,
        manga_tags,
        manga_creators,
        manga_languages,
      } = data;

      const result = await this.mangaGraphql.queryMangaById(token, {
        id: mangaId,
      });

      if (result.errors && result.errors.length > 0) {
        return result;
      }

      if (result.data.manga_by_pk === null) {
        return result.data;
      }

      let { poster: posterUrl, banner: bannerUrl } = result.data.manga_by_pk;

      // upload files
      const bannerFile = files.filter((f) => f.fieldname === 'banner')[0];
      if (bannerFile)
        bannerUrl = await this.filesService.uploadImageToS3(
          `manga-${mangaId}`,
          bannerFile
        );

      const posterFile = files.filter((f) => f.fieldname === 'poster')[0];
      if (posterFile)
        posterUrl = await this.filesService.uploadImageToS3(
          `manga-${mangaId}`,
          posterFile
        );

      // update manga in DB
      return {
        manga_id: mangaId,
        banner: bannerUrl,
        poster: posterUrl,
        status,
        release_date,
        contract_addresses: [],
        manga_tags: plainToInstance(MangaTag, JSON.parse(manga_tags)),
        manga_creators: plainToInstance(
          MangaCreator,
          JSON.parse(manga_creators)
        ),
        manga_languages: plainToInstance(
          MangaLanguage,
          JSON.parse(manga_languages)
        ),
      };
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async deleteManga(mangaId: number) {
    const creatorId = await this.creatorService.getCreatorIdAuthToken();

    const isOwner = await this.mangaGraphql.verifyMangaOwner({
      manga_id: mangaId,
      creator_id: creatorId,
    });

    if (!isOwner) throw new ForbiddenException('invalid creator');

    return this.mangaGraphql.removeManga(mangaId);
  }
}

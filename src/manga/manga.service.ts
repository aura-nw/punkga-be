import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import {
  CreateMangaRequestDto,
  MangaCreator,
  MangaLanguage,
  MangaTag,
} from './dto/create-manga-request.dto';
import { ContextProvider } from '../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { GraphqlService } from '../graphql/graphql.service';
import { UpdateMangaRequestDto } from './dto/update-manga-request.dto';
import { generateSlug } from './util';
import { detectMangaSlugId } from '../utils/utils';
import { GetChapterByMangaParamDto } from './dto/get-chapter-by-manga-request.dto';

@Injectable()
export class MangaService {
  private readonly logger = new Logger(MangaService.name);

  constructor(
    private configSvc: ConfigService,
    private filesService: FilesService,
    private graphqlSvc: GraphqlService
  ) {}

  async get(slug: string, user_id = '') {
    const { mangaId, mangaSlug } = detectMangaSlugId(slug);

    const variables = {
      id: mangaId,
      slug: mangaSlug,
      user_id,
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query QueryMangaByIdOrSlug ($user_id: bpchar = "", $slug: String = "", $id: Int = 0) {
        manga(where: {_and: {_or: [{id: {_eq: $id}}, {slug: {_eq: $slug}}]}, status: {_neq: "Removed"}}) {
          id
          slug
          poster
          banner
          contract_addresses
          status
          release_date
          manga_creators {
            creator {
              id
              name
              pen_name
              isActive
            }
          }
          manga_total_likes {
            likes
          }
          manga_total_views {
            views
          }
          manga_languages {
            title
            description
            is_main_language
            language_id
          }
          chapters_aggregate {
            aggregate {
              count
            }
          }
          chapters(order_by: {chapter_number:desc_nulls_last}, where: {status:{_neq:"Inactive"}}) {
            id
            chapter_number
            chapter_name
            chapter_type
            thumbnail_url
            pushlish_date
            status
            views
            chapter_total_likes {
              likes
            }
            chapters_likes(where: {user_id:{_eq:$user_id}}) {
              id
              created_at
            }
          }
          manga_subscribers_aggregate {
            aggregate {
              count
            }
          }
          manga_tags(limit: 5) {
            tag {
              id
              tag_languages {
                language_id
                value
              }
            }
          }
          manga_subscribers(where: {user_id:{_eq:$user_id}}) {
            id
            created_at
          }
        }
      }
      `,
      'QueryMangaByIdOrSlug',
      variables
    );

    return result;
  }

  async getChapterByManga(param: GetChapterByMangaParamDto, user_id: string) {
    const { slug, chapter_number } = param;
    const { mangaId, mangaSlug } = detectMangaSlugId(slug);

    const variables = {
      manga_slug: mangaSlug,
      manga_id: mangaId,
      chapter_number,
      user_id,
    };

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query GetChapterReadingDetail($manga_slug: String = "", $manga_id: Int = 0, $chapter_number: Int = 1, $user_id: bpchar = "") {
        chapters(where: {_and: {chapter_number: {_eq: $chapter_number}, manga: {_and: {_or: [{slug: {_eq: $manga_slug}}, {id: {_eq: $manga_id}}], status: {_in: ["On-Going", "Finished"]}}}}}) {
          id
          chapter_number
          chapter_name
          chapter_type
          thumbnail_url
          status
          pushlish_date
          chapter_languages(where: {chapter: {status: {_eq: "Published"}}}) {
            language_id
            detail
          }
          comments: social_activities_aggregate {
            aggregate {
              count
            }
          }
          views
          chapters_likes_aggregate {
            aggregate {
              count
            }
          }
          chapters_likes(where: {user_id: {_eq: $user_id}}) {
            id
            created_at
            user_id
            chapter_id
          }
        }
      }
      `,
      'GetChapterReadingDetail',
      variables
    );

    return result;
  }

  async create(data: CreateMangaRequestDto, files: Array<Express.Multer.File>) {
    const { token } = ContextProvider.getAuthUser();
    const { status, contract_addresses, release_date } = data;
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
    const variables = {
      status,
      manga_tags,
      manga_creators,
      manga_languages,
      release_date,
      contract_addresses: JSON.parse(contract_addresses),
    };
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation CreateNewManga($status: String = "", $contract_addresses: jsonb = "", $banner: String = "", $poster: String = "", $manga_languages: [manga_languages_insert_input!] = {language_id: 10, is_main_language: false, description: "", title: ""}, $manga_creators: [manga_creator_insert_input!] = {creator_id: 10}, $manga_tags: [manga_tag_insert_input!] = {tag_id: 10}, $release_date: timestamptz = "") {
        insert_manga_one(object: {status: $status, contract_addresses: $contract_addresses, manga_creators: {data: $manga_creators}, banner: $banner, poster: $poster, manga_languages: {data: $manga_languages}, manga_tags: {data: $manga_tags}, release_date: $release_date}) {
          id
          created_at
          status
          release_date
        }
      }`,
      'CreateNewManga',
      variables
    );

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
    const updateVariables = {
      id: mangaId,
      banner: bannerUrl,
      poster: posterUrl,
      slug,
    };
    const updateResponse = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateMangaByPK($banner: String = "", $poster: String = "", $id: Int = 10, $slug: String = "") {
        update_manga_by_pk(pk_columns: {id: $id}, _set: {banner: $banner, poster: $poster, slug: $slug}) {
          id
          banner
          poster
          status
          contract_addresses
          created_at
        }
      }`,
      'UpdateMangaByPK',
      updateVariables
    );

    return updateResponse;
  }

  async update(
    mangaId: number,
    data: UpdateMangaRequestDto,
    files: Array<Express.Multer.File>
  ) {
    const { token } = ContextProvider.getAuthUser();
    const {
      status,
      release_date,
      manga_tags,
      manga_creators,
      manga_languages,
      contract_addresses,
    } = data;

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query QueryMangaById($id: Int = 10) {
        manga_by_pk(id: $id) {
          id
          poster
          banner
          contract_addresses
        }
      }`,
      'QueryMangaById',
      {
        id: mangaId,
      }
    );

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
    const updateVariables = {
      manga_id: mangaId,
      banner: bannerUrl,
      poster: posterUrl,
      status,
      release_date,
      contract_addresses: JSON.parse(contract_addresses),
      manga_tags: plainToInstance(MangaTag, JSON.parse(manga_tags)),
      manga_creators: plainToInstance(MangaCreator, JSON.parse(manga_creators)),
      manga_languages: plainToInstance(
        MangaLanguage,
        JSON.parse(manga_languages)
      ),
    };
    const updateResponse = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateManga($manga_id: Int!, $status: String!, $contract_addresses: jsonb = "", $banner: String!, $poster: String!, $manga_languages: [manga_languages_insert_input!] = {language_id: 10, is_main_language: false, description: "", title: ""}, $manga_creators: [manga_creator_insert_input!] = {creator_id: 10}, $manga_tags: [manga_tag_insert_input!] = {tag_id: 10}, $release_date: timestamptz = "") {
        delete_manga_tag(where: {manga_id: {_eq: $manga_id}}) {
          affected_rows
        }
        delete_manga_creator(where: {manga_id: {_eq: $manga_id}}) {
          affected_rows
        }
        delete_manga_languages(where: {manga_id: {_eq: $manga_id}}) {
          affected_rows
        }
        insert_manga_one(object: {status: $status, contract_addresses: $contract_addresses, manga_creators: {data: $manga_creators}, banner: $banner, poster: $poster, manga_languages: {data: $manga_languages}, manga_tags: {data: $manga_tags}, id: $manga_id, release_date: $release_date}, on_conflict: {constraint: manga_pkey, update_columns: [banner, poster, status, release_date, contract_addresses]}) {
          id
          banner
          poster
          status
          release_date
          created_at
          manga_creators {
            creator_id
          }
          manga_languages {
            language_id
            title
            is_main_language
            description
          }
          manga_tags {
            tag_id
          }
        }
      }
      `,
      'UpdateManga',
      updateVariables
    );

    return updateResponse;
  }

  async getAccess(mangaId: number) {
    try {
      const network = this.configSvc.get<string>('horosope.network');
      let nft = false;
      const { token } = ContextProvider.getAuthUser();
      const result = await this.graphqlSvc.query(
        this.configSvc.get<string>('graphql.endpoint'),
        token,
        `query QueryUserAddress {
        authorizer_users {
          wallet_address
        }
      }`,
        'QueryUserAddress',
        {}
      );

      if (this.graphqlSvc.errorOrEmpty(result, 'authorizer_users')) {
        return result;
      }

      const walletAddress = result.data.authorizer_users[0].wallet_address;
      if (walletAddress === null)
        return {
          nft,
        };

      // get contract_addresses
      const queryMangaResult = await this.graphqlSvc.query(
        this.configSvc.get<string>('graphql.endpoint'),
        token,
        `query QueryManga($id: Int!) {
        manga_by_pk(id: $id) {
          contract_addresses
        }
      }`,
        'QueryManga',
        {
          id: mangaId,
        }
      );

      if (this.graphqlSvc.errorOrEmpty(queryMangaResult, 'manga_by_pk')) {
        return queryMangaResult;
      }

      const contract_addresses =
        queryMangaResult.data.manga_by_pk.contract_addresses;

      // check data on horoscope
      const getCw721TokenResult = await this.graphqlSvc.query(
        this.configSvc.get<string>('horosope.endpoint'),
        token,
        `query QueryCw721Tokens($owner: String = "", $smart_contracts: [String!] = "") {
        ${network} {
          cw721_contract(where: {smart_contract: {address: {_in: $smart_contracts}}}) {
            id
            cw721_tokens(where: {burned: {_eq: false}, owner: {_eq: $owner}}) {
              token_id
            }
          }
        }
      }`,
        'QueryCw721Tokens',
        {
          smart_contracts: contract_addresses,
          owner: walletAddress,
        }
      );

      if (
        getCw721TokenResult.data[`${network}`].cw721_contract.length > 0 &&
        getCw721TokenResult.data[`${network}`].cw721_contract[0].cw721_tokens
          .length > 0
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
}

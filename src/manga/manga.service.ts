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

@Injectable()
export class MangaService {
  private readonly logger = new Logger(MangaService.name);

  constructor(
    private configSvc: ConfigService,
    private filesService: FilesService,
    private graphqlSvc: GraphqlService,
  ) {}

  async create(data: CreateMangaRequestDto, files: Array<Express.Multer.File>) {
    const { token } = ContextProvider.getAuthUser();
    const { status, contract_address, release_date } = data;
    const manga_tags = plainToInstance(
      MangaTag,
      JSON.parse(data.manga_tags) as any[],
    );
    const manga_creators = plainToInstance(
      MangaCreator,
      JSON.parse(data.manga_creators) as any[],
    );
    const manga_languages = plainToInstance(
      MangaLanguage,
      JSON.parse(data.manga_languages) as any[],
    );

    // insert manga to DB
    const variables = {
      status,
      manga_tags,
      manga_creators,
      manga_languages,
      release_date,
      contract_address,
    };
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation CreateNewManga($status: String = "", $contract_address: String = "", $banner: String = "", $poster: String = "", $manga_languages: [manga_languages_insert_input!] = {language_id: 10, is_main_language: false, description: "", title: ""}, $manga_creators: [manga_creator_insert_input!] = {creator_id: 10}, $manga_tags: [manga_tag_insert_input!] = {tag_id: 10}, $release_date: timestamptz = "") {
        insert_manga_one(object: {status: $status, contract_address: $contract_address, manga_creators: {data: $manga_creators}, banner: $banner, poster: $poster, manga_languages: {data: $manga_languages}, manga_tags: {data: $manga_tags}, release_date: $release_date}) {
          id
          created_at
          status
          release_date
        }
      }`,
      'CreateNewManga',
      variables,
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
        bannerFile,
      );

    const posterFile = files.filter((f) => f.fieldname === 'poster')[0];
    if (bannerFile)
      posterUrl = await this.filesService.uploadImageToS3(
        `manga-${mangaId}`,
        posterFile,
      );

    // update manga in DB
    const udpateVariables = {
      id: mangaId,
      banner: bannerUrl,
      poster: posterUrl,
    };
    const updateResponse = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateMangaByPK($banner: String = "", $poster: String = "", $id: Int = 10) {
        update_manga_by_pk(pk_columns: {id: $id}, _set: {banner: $banner, poster: $poster}) {
          id
          banner
          poster
          status
          contract_address
          created_at
        }
      }`,
      'UpdateMangaByPK',
      udpateVariables,
    );

    return updateResponse;
  }

  async update(
    mangaId: number,
    data: UpdateMangaRequestDto,
    files: Array<Express.Multer.File>,
  ) {
    const { token } = ContextProvider.getAuthUser();
    const {
      status,
      release_date,
      manga_tags,
      manga_creators,
      manga_languages,
      contract_address,
    } = data;

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query QueryMangaById($id: Int = 10) {
        manga_by_pk(id: $id) {
          id
          poster
          banner
          contract_address
        }
      }`,
      'QueryMangaById',
      {
        id: mangaId,
      },
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
        bannerFile,
      );

    const posterFile = files.filter((f) => f.fieldname === 'poster')[0];
    if (posterFile)
      posterUrl = await this.filesService.uploadImageToS3(
        `manga-${mangaId}`,
        posterFile,
      );

    // update manga in DB
    const updateVariables = {
      manga_id: mangaId,
      banner: bannerUrl,
      poster: posterUrl,
      status,
      release_date,
      contract_address,
      manga_tags: plainToInstance(MangaTag, JSON.parse(manga_tags)),
      manga_creators: plainToInstance(MangaCreator, JSON.parse(manga_creators)),
      manga_languages: plainToInstance(
        MangaLanguage,
        JSON.parse(manga_languages),
      ),
    };
    const updateResponse = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateManga($manga_id: Int!, $status: String!, $contract_address: String!, $banner: String!, $poster: String!, $manga_languages: [manga_languages_insert_input!] = {language_id: 10, is_main_language: false, description: "", title: ""}, $manga_creators: [manga_creator_insert_input!] = {creator_id: 10}, $manga_tags: [manga_tag_insert_input!] = {tag_id: 10}, $release_date: timestamptz = "") {
        delete_manga_tag(where: {manga_id: {_eq: $manga_id}}) {
          affected_rows
        }
        delete_manga_creator(where: {manga_id: {_eq: $manga_id}}) {
          affected_rows
        }
        delete_manga_languages(where: {manga_id: {_eq: $manga_id}}) {
          affected_rows
        }
        insert_manga_one(object: {status: $status, contract_address: $contract_address, manga_creators: {data: $manga_creators}, banner: $banner, poster: $poster, manga_languages: {data: $manga_languages}, manga_tags: {data: $manga_tags}, id: $manga_id, release_date: $release_date}, on_conflict: {constraint: manga_pkey, update_columns: [banner, poster, status, release_date, contract_address]}) {
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
      updateVariables,
    );

    return updateResponse;
  }
}

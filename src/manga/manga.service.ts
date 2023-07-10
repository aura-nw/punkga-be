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
    const { status } = data;
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
    };
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `
        mutation CreateNewManga($status: String = "", $banner: String = "", $poster: String = "", $manga_languages: [manga_languages_insert_input!] = {language_id: 10, is_main_language: false, description: "", title: ""}, $manga_creators: [manga_creator_insert_input!] = {creator_id: 10}, $manga_tags: [manga_tag_insert_input!] = {tag_id: 10}) {
          insert_manga_one(object: {status: $status, manga_creators: {data: $manga_creators}, banner: $banner, poster: $poster, manga_languages: {data: $manga_languages}, manga_tags: {data: $manga_tags}}) {
            id
            created_at
            status
          }
        }        
        `,
      'CreateNewManga',
      variables,
    );

    if (result.errors && result.errors.length > 0) {
      return result;
    }

    // upload files
    const mangaId = result.data.insert_manga_one.id;
    const bannerFile = files.filter((f) => f.fieldname === 'banner')[0];
    const bannerUrl = await this.filesService.uploadImageToS3(
      mangaId,
      bannerFile,
    );

    const posterFile = files.filter((f) => f.fieldname === 'poster')[0];
    const posterUrl = await this.filesService.uploadImageToS3(
      mangaId,
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
    const { status } = data;

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query QueryMangaById($id: Int = 10) {
        manga_by_pk(id: $id) {
          id
          poster
          banner
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
      bannerUrl = await this.filesService.uploadImageToS3(mangaId, bannerFile);

    const posterFile = files.filter((f) => f.fieldname === 'poster')[0];
    if (posterFile)
      posterUrl = await this.filesService.uploadImageToS3(mangaId, posterFile);

    // update manga in DB
    const udpateVariables = {
      id: mangaId,
      banner: bannerUrl,
      poster: posterUrl,
      status,
    };
    const updateResponse = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateMangaByPK($banner: String = "", $poster: String = "", $id: Int = 10, $status: String = "") {
        update_manga_by_pk(pk_columns: {id: $id}, _set: {banner: $banner, poster: $poster, status: $status}) {
          id
          banner
          poster
          status
          created_at
        }
      }`,
      'UpdateMangaByPK',
      udpateVariables,
    );

    return updateResponse;
  }
}

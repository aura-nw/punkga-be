import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateCreatorRequestDto } from './dto/create-creator-request.dto';
import { ContextProvider } from '../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class CreatorService {
  private readonly logger = new Logger(CreatorService.name);

  constructor(
    private configSvc: ConfigService,
    private filesService: FilesService,
    private graphqlSvc: GraphqlService,
  ) {}

  async create(
    data: CreateCreatorRequestDto,
    files: Array<Express.Multer.File>,
  ) {
    try {
      const { token } = ContextProvider.getAuthUser();
      const { name, bio, socials, pen_name, gender, dob } = data;

      // insert manga to DB
      const variables = {
        name,
        bio,
        socials: JSON.parse(socials),
        pen_name,
        gender,
        dob,
      };
      const result = await this.graphqlSvc.query(
        this.configSvc.get<string>('graphql.endpoint'),
        token,
        `mutation AddCreator($name: String, $bio: String, $socials: jsonb = null, $pen_name: String = "", $profile_picture: String = "", $gender: String = "", $dob: String = "", $avatar_url: String = "") {
        insert_creators_one(object: {name: $name, bio: $bio, socials: $socials, pen_name: $pen_name, gender: $gender, dob: $dob, avatar_url: $avatar_url}) {
          id
          name
          socials
          created_at
          bio
        }
      }`,
        'AddCreator',
        variables,
      );

      if (result.errors && result.errors.length > 0) {
        return result;
      }

      // upload files
      const creatorId = result.data.insert_creators_one.id;

      let avatarUrl = '';
      const avatarFile = files.filter((f) => f.fieldname === 'avatar')[0];
      if (avatarFile)
        avatarUrl = await this.filesService.uploadImageToS3(
          `creator-${creatorId}`,
          avatarFile,
        );

      // update creator in DB
      const updateVariables = {
        id: creatorId,
        avatar_url: avatarUrl,
      };
      const updateResponse = await this.graphqlSvc.query(
        this.configSvc.get<string>('graphql.endpoint'),
        token,
        `mutation UpdateAvatar($id: Int = 10, $avatar_url: String = "") {
        update_creators_by_pk(pk_columns: {id: $id}, _set: {avatar_url: $avatar_url}) {
          id
          avatar_url
        }
      }
      `,
        'UpdateAvatar',
        updateVariables,
      );

      return updateResponse;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  // async update(
  //   mangaId: number,
  //   data: UpdateMangaRequestDto,
  //   files: Array<Express.Multer.File>,
  // ) {
  //   const { token } = ContextProvider.getAuthUser();
  //   const {
  //     status,
  //     release_date,
  //     manga_tags,
  //     manga_creators,
  //     manga_languages,
  //     contract_address,
  //   } = data;

  //   const result = await this.graphqlSvc.query(
  //     this.configSvc.get<string>('graphql.endpoint'),
  //     token,
  //     `query QueryMangaById($id: Int = 10) {
  //       manga_by_pk(id: $id) {
  //         id
  //         poster
  //         banner
  //         contract_address
  //       }
  //     }`,
  //     'QueryMangaById',
  //     {
  //       id: mangaId,
  //     },
  //   );

  //   if (result.errors && result.errors.length > 0) {
  //     return result;
  //   }

  //   if (result.data.manga_by_pk === null) {
  //     return result.data;
  //   }

  //   let { poster: posterUrl, banner: bannerUrl } = result.data.manga_by_pk;

  //   // upload files
  //   const bannerFile = files.filter((f) => f.fieldname === 'banner')[0];
  //   if (bannerFile)
  //     bannerUrl = await this.filesService.uploadImageToS3(
  //       `manga-${mangaId}`,
  //       bannerFile,
  //     );

  //   const posterFile = files.filter((f) => f.fieldname === 'poster')[0];
  //   if (posterFile)
  //     posterUrl = await this.filesService.uploadImageToS3(
  //       `manga-${mangaId}`,
  //       posterFile,
  //     );

  //   // update manga in DB
  //   const updateVariables = {
  //     manga_id: mangaId,
  //     banner: bannerUrl,
  //     poster: posterUrl,
  //     status,
  //     release_date,
  //     contract_address,
  //     manga_tags: plainToInstance(MangaTag, JSON.parse(manga_tags)),
  //     manga_creators: plainToInstance(MangaCreator, JSON.parse(manga_creators)),
  //     manga_languages: plainToInstance(
  //       MangaLanguage,
  //       JSON.parse(manga_languages),
  //     ),
  //   };
  //   const updateResponse = await this.graphqlSvc.query(
  //     this.configSvc.get<string>('graphql.endpoint'),
  //     token,
  //     `mutation UpdateManga($manga_id: Int!, $status: String!, $contract_address: String!, $banner: String!, $poster: String!, $manga_languages: [manga_languages_insert_input!] = {language_id: 10, is_main_language: false, description: "", title: ""}, $manga_creators: [manga_creator_insert_input!] = {creator_id: 10}, $manga_tags: [manga_tag_insert_input!] = {tag_id: 10}, $release_date: timestamptz = "") {
  //       delete_manga_tag(where: {manga_id: {_eq: $manga_id}}) {
  //         affected_rows
  //       }
  //       delete_manga_creator(where: {manga_id: {_eq: $manga_id}}) {
  //         affected_rows
  //       }
  //       delete_manga_languages(where: {manga_id: {_eq: $manga_id}}) {
  //         affected_rows
  //       }
  //       insert_manga_one(object: {status: $status, contract_address: $contract_address, manga_creators: {data: $manga_creators}, banner: $banner, poster: $poster, manga_languages: {data: $manga_languages}, manga_tags: {data: $manga_tags}, id: $manga_id, release_date: $release_date}, on_conflict: {constraint: manga_pkey, update_columns: [banner, poster, status, release_date, contract_address]}) {
  //         id
  //         banner
  //         poster
  //         status
  //         release_date
  //         created_at
  //         manga_creators {
  //           creator_id
  //         }
  //         manga_languages {
  //           language_id
  //           title
  //           is_main_language
  //           description
  //         }
  //         manga_tags {
  //           tag_id
  //         }
  //       }
  //     }
  //     `,
  //     'UpdateManga',
  //     updateVariables,
  //   );

  //   return updateResponse;
  // }
}

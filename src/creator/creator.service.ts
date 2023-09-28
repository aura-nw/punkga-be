import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateCreatorRequestDto } from './dto/create-creator-request.dto';
import { ContextProvider } from '../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { GraphqlService } from '../graphql/graphql.service';
import { UpdateCreatorRequestDto } from './dto/update-creator-request.dto';

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

      // insert creator to DB
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

  async update(
    creatorId: number,
    data: UpdateCreatorRequestDto,
    files: Array<Express.Multer.File>,
  ) {
    const { token } = ContextProvider.getAuthUser();
    const { name, socials, pen_name, bio, gender, dob } = data;

    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query QueryCreatorById($id: Int!) {
        creators_by_pk(id: $id) {
          id
          avatar_url
        }
      }
      `,
      'QueryCreatorById',
      {
        id: creatorId,
      },
    );

    if (result.errors && result.errors.length > 0) {
      return result;
    }

    if (result.data.creators_by_pk === null) {
      return result.data;
    }

    let { avatar_url: avatarUrl } = result.data.creators_by_pk;

    // upload files
    const avatarFile = files.filter((f) => f.fieldname === 'avatar')[0];
    if (avatarFile)
      avatarUrl = await this.filesService.uploadImageToS3(
        `creator-${creatorId}`,
        avatarFile,
      );

    // update creator in DB
    const variables = {
      id: creatorId,
      name,
      bio: bio.toString(),
      socials: JSON.parse(socials),
      pen_name,
      gender,
      dob,
      avatar_url: avatarUrl,
    };
    const updateResult = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation AddCreator($name: String, $bio: String, $socials: jsonb = null, $pen_name: String = "", $gender: String = "", $dob: String = "", $avatar_url: String = "", $id: Int = 10) {
        insert_creators_one(object: {name: $name, bio: $bio, socials: $socials, pen_name: $pen_name, gender: $gender, dob: $dob, avatar_url: $avatar_url, id: $id}, on_conflict: {constraint: creators_pkey, update_columns: [name, pen_name, bio, socials, gender, dob, avatar_url]}) {
          id
          name
          pen_name
          dob
          gender
          socials
          created_at
          bio
          avatar_url
        }
      }
      `,
      'AddCreator',
      variables,
    );

    return updateResult;
  }
}

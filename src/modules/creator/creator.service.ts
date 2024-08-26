import { Injectable, Logger } from '@nestjs/common';

import { ContextProvider } from '../../providers/contex.provider';
import { detectSlugOrId } from '../../utils/utils';
import { FilesService } from '../files/files.service';
import { generateSlug } from '../manga/util';
import { CreatorGraphql } from './creator.graphql';
import { CreateCreatorRequestDto } from './dto/create-creator-request.dto';
import { UpdateCreatorRequestDto } from './dto/update-creator-request.dto';

@Injectable()
export class CreatorService {
  private readonly logger = new Logger(CreatorService.name);

  constructor(
    private filesService: FilesService,
    private creatorGraphql: CreatorGraphql
  ) {}

  async getCreatorIdAuthToken(): Promise<number> {
    const { userId } = ContextProvider.getAuthUser();
    const result = await this.creatorGraphql.queryCreatorIdByUserId({
      id: userId,
    });
    if (result.errors) return result;

    const creatorId = result.data.authorizer_users_by_pk.creator.id;
    return creatorId;
  }

  async getCreator() {
    const { userId, token } = ContextProvider.getAuthUser();
    const result = await this.creatorGraphql.queryCreatorIdByUserId({
      id: userId,
    });
    if (result.errors) return result;

    const creatorId = await this.getCreatorIdAuthToken();
    return this.get(creatorId.toString());
  }

  async get(keyword: string) {
    const { id, slug } = detectSlugOrId(keyword);

    const param = id > 0 ? '$id: Int!' : '$slug: String!';
    const whereCondition = id > 0 ? 'id: {_eq: $id}' : 'slug: {_eq: $slug}';
    const variables = id > 0 ? { id } : { slug };
    const result = await this.creatorGraphql.queryCreatorByIdOrSlug(
      param,
      whereCondition,
      variables
    );

    return result;
  }

  async create(
    data: CreateCreatorRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const { token } = ContextProvider.getAuthUser();
      const { name, bio, socials, pen_name, gender, dob, wallet_address } =
        data;

      // insert creator to DB
      const result = await this.creatorGraphql.addCreator(token, {
        name,
        bio,
        socials: JSON.parse(socials),
        pen_name,
        gender,
        dob,
        wallet_address,
      });

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
          avatarFile
        );

      // update creator in DB
      const updateResponse = await this.creatorGraphql.updateSlugAndAvatar(
        token,
        {
          id: creatorId,
          slug: generateSlug(pen_name, creatorId),
          avatar_url: avatarUrl,
        }
      );

      return updateResponse;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async updateCreator(
    data: UpdateCreatorRequestDto,
    files: Array<Express.Multer.File>
  ) {
    const creatorId = await this.getCreatorIdAuthToken();
    return this.update(creatorId, data, files, true);
  }

  async update(
    creatorId: number,
    data: UpdateCreatorRequestDto,
    files: Array<Express.Multer.File>,
    creatorRole = false
  ) {
    try {
      const { token } = ContextProvider.getAuthUser();
      const { name, socials, pen_name, bio, gender, dob, wallet_address } =
        data;

      const result = await this.creatorGraphql.queryCreatorById({
        id: creatorId,
      });

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
          avatarFile
        );

      // update creator in DB
      const updateResult = await this.creatorGraphql.updateCreator(
        token,
        {
          id: creatorId,
          name,
          bio: bio.toString(),
          socials: JSON.parse(socials),
          pen_name,
          gender,
          dob,
          avatar_url: avatarUrl,
          wallet_address,
        },
        creatorRole
      );

      return updateResult;
    } catch (errors) {
      return {
        errors,
      };
    }
  }
}

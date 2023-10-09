import { Injectable, Logger } from '@nestjs/common';
import { CreateCreatorRequestDto } from './dto/create-creator-request.dto';
import { ContextProvider } from '../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { UpdateCreatorRequestDto } from './dto/update-creator-request.dto';
import { CreatorGraphql } from './creator.graphql';
import { generateSlug } from '../manga/util';
import { detectSlugOrId } from '../utils/utils';

@Injectable()
export class CreatorService {
  private readonly logger = new Logger(CreatorService.name);

  constructor(
    private filesService: FilesService,
    private creatorGraphql: CreatorGraphql
  ) {}

  async get(slug: string) {
    const { id, slug: mangaSlug } = detectSlugOrId(slug);

    const result = await this.creatorGraphql.queryCreatorByIdOrSlug({
      id,
      slug: mangaSlug,
    });

    return result;
  }

  async create(
    data: CreateCreatorRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
      const { token } = ContextProvider.getAuthUser();
      const { name, bio, socials, pen_name, gender, dob } = data;

      // insert creator to DB
      const result = await this.creatorGraphql.addCreator(token, {
        name,
        bio,
        socials: JSON.parse(socials),
        pen_name,
        gender,
        dob,
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

  async update(
    creatorId: number,
    data: UpdateCreatorRequestDto,
    files: Array<Express.Multer.File>
  ) {
    const { token } = ContextProvider.getAuthUser();
    const { name, socials, pen_name, bio, gender, dob } = data;

    const result = await this.creatorGraphql.queryCreatorById(token, {
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
    const updateResult = await this.creatorGraphql.updateCreator(token, {
      id: creatorId,
      name,
      bio: bio.toString(),
      socials: JSON.parse(socials),
      pen_name,
      gender,
      dob,
      avatar_url: avatarUrl,
    });

    return updateResult;
  }
}

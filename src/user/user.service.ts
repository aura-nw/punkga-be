import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteUserRequest } from './dto/delete-user-request.dto';
import { Authorizer } from '@authorizerdev/authorizer-js';
import { LikeChapterParam } from './dto/like-chapter-request.dto';
import { GraphqlService } from '../graphql/graphql.service';
import { ContextProvider } from '../providers/contex.provider';
import { RedisService } from '../redis/redis.service';
import { UpdateProfileRequestDto } from './dto/update-profile-request.dto';
import { IUpdateProfile } from './interfaces/update-profile.interface';
import { FilesService } from '../files/files.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    private configService: ConfigService,
    private graphqlSvc: GraphqlService,
    private redisClientService: RedisService,
    private filesService: FilesService,
  ) {}

  async updateProfile(
    data: UpdateProfileRequestDto,
    files: Array<Express.Multer.File>,
  ) {
    const { birthdate, gender, bio } = data;
    const { token, userId } = ContextProvider.getAuthUser();

    const variables: IUpdateProfile = {
      id: userId,
      _set: {
        bio,
        gender,
        birthdate,
      },
    };

    const pictureFile = files.filter((f) => f.fieldname === 'picture')[0];
    if (pictureFile) {
      const pictureUrl = await this.filesService.uploadImageToS3(
        `user-${userId}`,
        pictureFile,
      );

      variables._set.picture = pictureUrl;
    }

    const result = await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateUserProfile($id: bpchar = "", $_set: authorizer_users_set_input = {bio: "", nickname: ""}) {
        update_authorizer_users(where: {id: {_eq: $id}}, _set: $_set) {
          affected_rows
          returning {
            email
            bio
            picture
            birthdate
          }
        }
      }
      `,
      'UpdateUserProfile',
      variables,
    );

    return result;
  }

  async delete(data: DeleteUserRequest) {
    const { email } = data;
    console.log(data);

    const query =
      'mutation deleteUser($email: String! = "") { _delete_user(params: {email: $email}) { message }}';

    const variables = {
      email,
    };

    const headers = {
      'x-authorizer-admin-secret': this.configService.get<string>(
        'authorizer.adminSecret',
      ),
    };

    const authRef = new Authorizer({
      redirectURL: this.configService.get<string>('authorizer.redirectUrl'), // window.location.origin
      authorizerURL: this.configService.get<string>('authorizer.authorizerUrl'),
      clientID: this.configService.get<string>('authorizer.clientId'), // obtain your client id from authorizer dashboard
    });

    try {
      const result = await authRef.graphqlQuery({
        query,
        variables,
        headers,
      });
      return {
        error: false,
        message: result._delete_user.message,
      };
    } catch (error: any) {
      return {
        error: true,
        message: error.message,
      };
    }
  }

  async likeChapter({ chapterId }: LikeChapterParam) {
    const { token, userId } = ContextProvider.getAuthUser();

    const result = await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `mutation UserLikeChapter ($chapter_id: Int!) {
        insert_likes_one(object: {chapter_id:$chapter_id}) {
          id
          user_id
          chapter_id
          created_at
        }
      }`,
      'UserLikeChapter',
      {
        chapter_id: chapterId,
      },
    );

    // success
    if (
      result.data?.insert_likes_one &&
      result.data?.insert_likes_one !== null
    ) {
      this.logger.log(`User ${userId} like chapter ${chapterId}`);
      // add to redis
      this.redisClientService.client.sAdd(
        [
          this.configService.get<string>('app.name'),
          this.configService.get<string>('app.env'),
          'chapter-likes',
        ].join(':'),
        chapterId.toString(),
      );

      // increase
      this.redisClientService.client.incr(
        [
          this.configService.get<string>('app.name'),
          this.configService.get<string>('app.env'),
          'chapters',
          chapterId.toString(),
          'like',
        ].join(':'),
      );
    }
    return result;
  }
}

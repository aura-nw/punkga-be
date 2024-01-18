import { Authorizer } from '@authorizerdev/authorizer-js';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FilesService } from '../files/files.service';
import { ContextProvider } from '../../providers/contex.provider';
import { DeleteUserRequest } from './dto/delete-user-request.dto';
import { UpdateProfileRequestDto } from './dto/update-profile-request.dto';
import { IUpdateProfile } from './interfaces/update-profile.interface';
import { UserGraphql } from './user.graphql';
import { MangaService } from '../manga/manga.service';
import { CheckConditionService } from '../quest/check-condition.service';
import { CheckRewardService } from '../quest/check-reward.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    private configService: ConfigService,
    private filesService: FilesService,
    private mangaService: MangaService,
    private checkConditionService: CheckConditionService,
    private checkRewardService: CheckRewardService,
    private userGraphql: UserGraphql
  ) { }

  async readChapter(chapterId: number) {
    try {
      const chapter = await this.userGraphql.getChapterDetail({
        id: chapterId,
      });

      if (chapter.chapter_type === 'NFTs only') {
        const { nft } = await this.mangaService.getAccess(chapter.manga_id);
        if (!nft) throw new ForbiddenException();
      }

      const { token } = ContextProvider.getAuthUser();
      return this.userGraphql.userReadChapter(token, {
        chapter_id: chapterId,
      });
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async getUserAvailableQuest() {
    try {
      // const { userId } = ContextProvider.getAuthUser();
      const userId = "12818ea8-ea9e-4201-b620-1b934a208f83"
      const quests: any[] = await this.userGraphql.getAllPublishedQuest(userId);

      const user = await this.userGraphql.queryUserLevel({
        id: userId,
      });

      // check condition
      const checkConditionPromises = [];
      quests.forEach((quest) => {
        checkConditionPromises.push(this.checkConditionService.verify(quest.condition, user));
      });

      const checkConditionResult = await Promise.all(checkConditionPromises);

      const availableQuests = [];
      checkConditionResult.forEach((valid, index) => {

        const quest = quests[index];
        // frontend need unlock field
        quest.unlock = true;

        if (valid) availableQuests.push(quest)
      });

      const checkRequirementResult = await Promise.all(availableQuests.map((quest) => this.checkRewardService.getClaimRewardStatus(quest, userId)));
      const finalResult = availableQuests.map((quest, index) => {
        quest.reward_status = checkRequirementResult[index];
        return quest;
      });

      return finalResult;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async updateProfile(
    data: UpdateProfileRequestDto,
    files: Array<Express.Multer.File>
  ) {
    try {
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
          pictureFile
        );

        variables._set.picture = pictureUrl;
      }

      const result = await this.userGraphql.updateUserProfile(token, variables);

      return result;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async delete(data: DeleteUserRequest) {
    const { email } = data;
    this.logger.debug('delete user data: ' + data);

    const query =
      'mutation deleteUser($email: String! = "") { _delete_user(params: {email: $email}) { message }}';

    const variables = {
      email,
    };

    const headers = {
      'x-authorizer-admin-secret': this.configService.get<string>(
        'authorizer.adminSecret'
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
}

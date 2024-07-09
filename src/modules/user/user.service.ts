import { Queue } from 'bull';
import { SiweMessage } from 'siwe';

import { Authorizer } from '@authorizerdev/authorizer-js';
import { InjectQueue } from '@nestjs/bull';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ContextProvider } from '../../providers/contex.provider';
import { FilesService } from '../files/files.service';
import { MangaService } from '../manga/manga.service';
import { CheckConditionService } from '../quest/check-condition.service';
import { CheckRewardService } from '../quest/check-reward.service';
import { RedisService } from '../redis/redis.service';
import { ConnectWalletRequestDto } from './dto/connect-wallet-request.dto';
import { DeleteUserRequest } from './dto/delete-user-request.dto';
import { UpdateProfileRequestDto } from './dto/update-profile-request.dto';
import { IUpdateProfile } from './interfaces/update-profile.interface';
import { UserGraphql } from './user.graphql';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    private configService: ConfigService,
    private filesService: FilesService,
    private mangaService: MangaService,
    private checkConditionService: CheckConditionService,
    private checkRewardService: CheckRewardService,
    private userGraphql: UserGraphql,
    private redisClientService: RedisService,
    @InjectQueue('userWallet')
    private readonly userWalletQueue: Queue
  ) {
    // const migrateWalletData = {
    //   requestId: 141,
    //   userId: '5995539a-1744-4a4f-8c5f-98a143f0eeaa',
    // };
    // const env = this.configService.get<string>('app.env') || 'prod';
    // this.redisClientService.client.rPush(
    //   `punkga-${env}:migrate-user-wallet`,
    //   JSON.stringify(migrateWalletData)
    // );
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async triggerMigrateWallet() {
    const activeJobCount = await this.userWalletQueue.getActiveCount();
    if (activeJobCount > 0) {
      // Busy Queue Execute Onchain
      return true;
    }

    const data = {
      redisKey: 'punkga:job:migrate-wallet',
      time: new Date().toUTCString(),
    };

    // create job to migrate wallet
    await this.userWalletQueue.add('migrate-wallet', data, {
      removeOnComplete: true,
      removeOnFail: 10,
      attempts: 5,
      backoff: 5000,
    });
  }

  async connectPersonalWallet(request: ConnectWalletRequestDto) {
    try {
      const { userId, token } = ContextProvider.getAuthUser();

      const { signature, message } = request;

      const SIWEObject = new SiweMessage(message);

      const { data } = await SIWEObject.verify({
        signature,
        nonce: SIWEObject.nonce,
      });

      const address = data.address;

      const result = await this.userGraphql.setPersonalAddress(
        {
          wallet_address: address,
        },
        token
      );

      if (result.errors && result.errors.length > 0) return result;
      if (result.data.update_authorizer_users.affected_rows === 0)
        throw new ForbiddenException('already link wallet');

      // request migrate
      const uniqueKey = `mw-${userId}`;
      const insertRequestResult = await this.userGraphql.insertRequestLog({
        data: {
          userId,
        },
        unique_key: uniqueKey,
      });

      if (insertRequestResult.errors) return insertRequestResult;
      this.logger.debug(`insert request success ${JSON.stringify(result)}`);

      const requestId = insertRequestResult.data.insert_request_log_one.id;
      const migrateWalletData = {
        requestId,
        userId,
      };

      const env = this.configService.get<string>('app.env') || 'prod';
      this.redisClientService.client.rPush(
        `punkga-${env}:migrate-user-wallet`,
        JSON.stringify(migrateWalletData)
      );

      return {
        requestId,
      };
    } catch (errors) {
      this.logger.error(errors);
      return {
        errors: {
          message: errors.toString(),
        },
      };
    }
  }

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
      const { userId } = ContextProvider.getAuthUser();
      const quests: any[] = await this.userGraphql.getAllPublishedQuest(userId);

      const user = await this.userGraphql.queryUserLevel({
        id: userId,
      });

      // check condition
      const checkConditionPromises = [];
      quests.forEach((quest) => {
        checkConditionPromises.push(
          this.checkConditionService.verify(quest.condition, user)
        );
      });

      const checkConditionResult = await Promise.all(checkConditionPromises);

      const availableQuests = [];
      checkConditionResult.forEach((valid, index) => {
        const quest = quests[index];
        // frontend need unlock field
        quest.unlock = true;

        if (valid) availableQuests.push(quest);
      });

      const checkRequirementResult = await Promise.all(
        availableQuests.map((quest) =>
          this.checkRewardService.getClaimRewardStatus(quest, userId)
        )
      );
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

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteUserRequest } from './dto/delete-user-request.dto';
import { Authorizer } from '@authorizerdev/authorizer-js';
import { ContextProvider } from '../providers/contex.provider';
import { UpdateProfileRequestDto } from './dto/update-profile-request.dto';
import { IUpdateProfile } from './interfaces/update-profile.interface';
import { FilesService } from '../files/files.service';
import { UserGraphql } from './user.graphql';
import * as bip39 from 'bip39';
import { Secp256k1HdWallet } from '@cosmjs/amino';
import { SysKeyService } from '../keys/syskey.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    private configService: ConfigService,
    private filesService: FilesService,
    private userGraphql: UserGraphql,
    private sysKeyService: SysKeyService
  ) {
    this.generateWallet();
  }

  async generateWallet() {
    const mnemonic = bip39.generateMnemonic();
    const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: 'aura',
    });

    const account = await wallet.getAccounts();
    const serializedWallet = await wallet.serialize(
      this.sysKeyService.originalSeed
    );

    // store db
    console.log(serializedWallet);
  }

  async updateProfile(
    data: UpdateProfileRequestDto,
    files: Array<Express.Multer.File>
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
        pictureFile
      );

      variables._set.picture = pictureUrl;
    }

    const result = await this.userGraphql.updateUserProfile(token, variables);

    return result;
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

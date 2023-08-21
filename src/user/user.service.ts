import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteUserRequest } from './dto/delete-user-request.dto';
import { Authorizer } from '@authorizerdev/authorizer-js';
import { GraphqlService } from '../graphql/graphql.service';
import { ContextProvider } from '../providers/contex.provider';
import { UpdateProfileRequestDto } from './dto/update-profile-request.dto';
import { IUpdateProfile } from './interfaces/update-profile.interface';
import { FilesService } from '../files/files.service';
import { SetWalletAddressDto } from './dto/set-wallet-address-request.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    private configService: ConfigService,
    private graphqlSvc: GraphqlService,
    private filesService: FilesService,
  ) {}

  async setWalletAddress(data: SetWalletAddressDto) {
    const { wallet_address } = data;
    const { token, userId } = ContextProvider.getAuthUser();

    const variables = {
      id: userId,
      wallet_address,
    };

    const result = await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `mutation SetUserWalletAddress($id: bpchar!, $wallet_address: String!) {
        update_authorizer_users(where: {id: {_eq: $id}, wallet_address: {_is_null: true}}, _set: {wallet_address: $wallet_address}) {
          returning {
            id
            wallet_address
          }
          affected_rows
        }
      }
      `,
      'SetUserWalletAddress',
      variables,
    );

    return result;
  }

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
    this.logger.debug('delete user data: ' + data);

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
}

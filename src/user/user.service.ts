import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteUserRequest } from './dto/delete-user-request.dto';
import { Authorizer } from '@authorizerdev/authorizer-js';

@Injectable()
export class UserService {
  constructor(private config: ConfigService) {}

  async delete(data: DeleteUserRequest) {
    const { email } = data;
    console.log(data);

    const query =
      'mutation deleteUser($email: String! = "") { _delete_user(params: {email: $email}) { message }}';

    const variables = {
      email,
    };

    const headers = {
      'x-authorizer-admin-secret': this.config.get<string>(
        'authorizer.adminSecret',
      ),
    };

    const authRef = new Authorizer({
      redirectURL: this.config.get<string>('authorizer.redirectUrl'), // window.location.origin
      authorizerURL: this.config.get<string>('authorizer.authorizerUrl'),
      clientID: this.config.get<string>('authorizer.clientId'), // obtain your client id from authorizer dashboard
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

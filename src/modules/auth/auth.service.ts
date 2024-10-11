import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Authorizer } from '@authorizerdev/authorizer-js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private configService: ConfigService) {}

  async login(email: string, password: string) {
    const query = `
    mutation userLogin($email: String!, $password: String!) {
      login(params: {email: $email, password: $password}) {
        user {
          id
          email
          given_name
          family_name
          picture
          roles
        }
        access_token
        expires_in
        message
      }
    }
    `;

    const variables = {
      email,
      password,
    };

    const authRef = new Authorizer({
      redirectURL: this.configService.get<string>('authorizer.redirectUrl'), // window.location.origin
      authorizerURL: this.configService.get<string>('authorizer.authorizerUrl'),
      clientID: this.configService.get<string>('authorizer.clientId'), // obtain your client id from authorizer dashboard
    });

    try {
      return authRef.graphqlQuery({
        query,
        variables,
      });
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}

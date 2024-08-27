import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { ContextProvider } from '../../providers/contex.provider';
import { TelegramGraphql } from './telegram.graphql';
import { Authorizer } from '@authorizerdev/authorizer-js';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private configService: ConfigService,
    private telegramGraphql: TelegramGraphql
  ) {}

  connect() {
    const { telegramUserId } = ContextProvider.getAuthUser();
    return this.telegramGraphql.getTelegramUser({
      id: telegramUserId,
    });
  }

  async link(email: string, password: string) {
    const { telegramUserId } = ContextProvider.getAuthUser();

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
      const result = await authRef.graphqlQuery({
        query,
        variables,
      });

      if (result.errors) return result;

      const userId = result.login.user.id;
      return this.telegramGraphql.updateTelegramUser({
        id: telegramUserId,
        user_id: userId,
      });
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}

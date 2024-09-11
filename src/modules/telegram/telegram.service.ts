import { readFile } from 'fs/promises';
import * as path from 'path';

import { Authorizer } from '@authorizerdev/authorizer-js';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { ContextProvider } from '../../providers/contex.provider';
import { SaveDonateTxDto } from './dto/save-donate-tx.dto';
import { TelegramGraphql } from './telegram.graphql';
import { Role } from '../../auth/role.enum';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private configService: ConfigService,
    private telegramGraphql: TelegramGraphql,
    private jwtService: JwtService
  ) {}

  async readChapter(manga_slug: string, chapter_number: number) {
    try {
      const result = await this.telegramGraphql.getChapterDetail({
        manga_slug,
        chapter_number,
      });

      return result;
    } catch (errors) {
      return {
        errors,
      };
    }
  }

  async connect() {
    const { telegramUserId } = ContextProvider.getAuthUser();
    const result = await this.telegramGraphql.getTelegramUser({
      id: telegramUserId,
    });

    if (result.data?.telegram_user?.authorizer_user !== null) {
      const payload = {
        'https://hasura.io/jwt/claims': {
          'x-hasura-allowed-roles': [Role.User],
          'x-hasura-default-role': Role.User,
          'x-hasura-user-email':
            result.data.telegram_user.authorizer_user.email,
          'x-hasura-user-id': result.data.telegram_user.authorizer_user.id,
        },
      };
      const privateKey = await readFile(
        path.resolve(__dirname, '../../../private.pem')
      );
      const access_token = await this.jwtService.signAsync(payload, {
        algorithm: 'RS256',
        privateKey,
      });
      result.data.telegram_user.authorizer_user.token = access_token;
    }
    return result;
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
      const updateResult = await this.telegramGraphql.updateTelegramUser({
        id: telegramUserId,
        user_id: userId,
      });
      const payload = {
        'https://hasura.io/jwt/claims': {
          'x-hasura-allowed-roles': [Role.User],
          'x-hasura-default-role': Role.User,
          'x-hasura-user-email':
            updateResult.data.telegram_user.authorizer_user.email,
          'x-hasura-user-id':
            updateResult.data.telegram_user.authorizer_user.id,
        },
      };
      const privateKey = await readFile(
        path.resolve(__dirname, '../../../private.pem')
      );
      const access_token = await this.jwtService.signAsync(payload, {
        algorithm: 'RS256',
        privateKey,
      });
      updateResult.data.telegram_user.authorizer_user.token = access_token;

      return updateResult;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  async saveTx(data: SaveDonateTxDto) {
    const { telegramId } = ContextProvider.getAuthUser();
    const { creator_id, txn, value } = data;

    return this.telegramGraphql.saveDonateHistory({
      object: {
        telegram_id: telegramId,
        creator_id,
        txn,
        value: Number(value),
      },
    });
  }
}

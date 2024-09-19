import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'crypto';
import { Request } from 'express';
import { readFile } from 'fs/promises';
import * as path from 'path';
import { ITelegramUser } from './interfaces/telegram-user.interface';
import { GraphqlService } from '../modules/graphql/graphql.service';
import { Role } from './role.enum';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractBrearerTokenFromHeader(request);
    if (token) {
      return this.bearerAuth(request);
    }

    return this.telegramAuth(request);
  }

  private async telegramAuth(request: Request) {
    const telegramInitData = this.extractTelegramInitData(request);
    if (!telegramInitData) {
      throw new UnauthorizedException();
    }

    const user: ITelegramUser = this.verifyTelegramWebAppData(telegramInitData);
    // insert user

    if (!user) {
      throw new UnauthorizedException('invalid token');
    }

    const username =
      !user.username || user.username === null
        ? `tele_${user.id.toString()}`
        : user.username;

    const insertResult = await this.insertTelegramUser({
      object: {
        telegram_id: user.id.toString(),
        username,
      },
    });
    if (insertResult.errors)
      throw new UnauthorizedException(JSON.stringify(insertResult));

    request['user'] = {
      userId: insertResult.data.insert_telegram_users_one.authorizer_user?.id,
      roles: [Role.TelegramUser],
      telegramUserId: insertResult.data.insert_telegram_users_one.id,
      telegramId: user.id.toString(),
    };

    return true;
  }

  private verifyTelegramWebAppData(telegramInitData: string) {
    const TELEGRAM_BOT_TOKEN =
      this.configService.get<string>('telgram.bot_token');
    // / The data is a query string, which is composed of a series of field-value pairs.
    const encoded = decodeURIComponent(telegramInitData);

    // HMAC-SHA-256 signature of the bot's token with the constant string WebAppData used as a key.
    const secret = createHmac('sha256', 'WebAppData').update(
      TELEGRAM_BOT_TOKEN
    );

    // Data-check-string is a chain of all received fields'.
    const arr = encoded.split('&');
    const hashIndex = arr.findIndex((str) => str.startsWith('hash='));
    const hash = arr.splice(hashIndex)[0].split('=')[1];
    // sorted alphabetically
    arr.sort((a, b) => a.localeCompare(b));
    // in the format key=<value> with a line feed character ('\n', 0x0A) used as separator
    // e.g., 'auth_date=<auth_date>\nquery_id=<query_id>\nuser=<user>
    const dataCheckString = arr.join('\n');

    // The hexadecimal representation of the HMAC-SHA-256 signature of the data-check-string with the secret key
    const _hash = createHmac('sha256', secret.digest())
      .update(dataCheckString)
      .digest('hex');

    // if hash are equal the data may be used on your server.
    // Complex data types are represented as JSON-serialized objects.
    if (_hash !== hash) throw new UnauthorizedException();

    const userIndex = arr.findIndex((str) => str.startsWith('user='));
    const user = JSON.parse(arr.splice(userIndex)[0].split('=')[1]);
    return user;
  }

  private async bearerAuth(request: Request): Promise<boolean> {
    const token = this.extractBrearerTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    const pubkey = await readFile(path.resolve(__dirname, '../../public.pem'));
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        publicKey: pubkey,
      });
      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      const {
        'x-hasura-user-id': userId,
        'x-hasura-allowed-roles': allowedRoles,
      } = payload['https://hasura.io/jwt/claims'];
      request['user'] = {
        userId,
        roles: allowedRoles,
        token,
      };
    } catch (e) {
      console.log(e);
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractBrearerTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractTelegramInitData(request: Request): string | undefined {
    return request.headers.authorization;
  }

  private insertTelegramUser(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configService.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `mutation insert_telegram_users_one($object: telegram_users_insert_input = {}) {
        insert_telegram_users_one(object: $object, on_conflict: {constraint: telegram_users_telegram_id_key, update_columns: updated_at}) {
          id
          authorizer_user {
            id
            email
            nickname
          }
        }
      }`,
      'insert_telegram_users_one',
      variables,
      headers
    );
  }
}

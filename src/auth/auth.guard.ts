import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
// import { jwtConstants } from './constants';
import { Request } from 'express';
import { readFile } from 'fs/promises';
import * as path from 'path';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractBrearerTokenFromHeader(request);
    if (token) {
      return this.bearerAuth(request);
    }
  }

  private async telegramAuth(request: Request) {}

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
}

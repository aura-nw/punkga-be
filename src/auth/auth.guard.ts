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
    const token = this.extractTokenFromHeader(request);
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
      if (allowedRoles.includes('admin')) {
        request['user'] = {
          userId,
          allowedRoles,
          token,
        };
      } else {
        throw new UnauthorizedException();
      }
    } catch (e) {
      console.log(e);
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

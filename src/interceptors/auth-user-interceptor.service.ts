import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ContextProvider } from '../providers/contex.provider';
import { UserDto } from '../auth/dto/user.dto';

@Injectable()
export class AuthUserInterceptor implements NestInterceptor {
  // eslint-disable-next-line class-methods-use-this
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>() as any;

    const user = <UserDto>request.user;
    ContextProvider.setAuthUser(user);

    return next.handle();
  }
}

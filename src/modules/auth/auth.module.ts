import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';

@Module({
  imports: [],
  providers: [],
  controllers: [AuthController],
  exports: [],
})
export class AuthModule { }

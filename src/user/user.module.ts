import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [JwtModule],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}

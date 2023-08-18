import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { GraphqlModule } from '../graphql/graphql.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [JwtModule, GraphqlModule, FilesModule],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}

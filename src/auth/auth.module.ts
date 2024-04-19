import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../modules/user/user.module';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => {
        return {
          privateKey: config.get<string>('jwt.privateKey'),
          publicKey: config.get<string>('jwt.publicKey'),
          signOptions: {
            algorithm: 'RS256',
            expiresIn: config.get<string | number>('jwt.expirationTime'),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule { }
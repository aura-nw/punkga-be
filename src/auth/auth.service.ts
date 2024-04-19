import { pubkeyToAddress } from '@cosmjs/amino';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { errorOrEmpty } from '../modules/graphql/utils';
import { UserGraphql } from '../modules/user/user.graphql';
import { verifySignature } from '../utils/utils';
import { SignInWalletRequestDto } from './dto/signin-wallet-request.dto';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';
import path from 'path';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private userGraphql: UserGraphql,
    private jwtService: JwtService
  ) {}

  async signInWithWallet(request: SignInWalletRequestDto): Promise<any> {
    try {
      const { signature, signedDoc } = request;

      const valid = await verifySignature(signature, signedDoc);
      if (!valid) throw new UnauthorizedException();

      const address = pubkeyToAddress(signature.pub_key, 'aura');

      let userId = '';
      // query user by wallet address
      const result = await this.userGraphql.queryUserByWalletAddress(address);
      if (errorOrEmpty(result, 'authorizer_users')) {
        // TODO: insert user if not exists
      } else {
        userId = result.data.authorizer_users[0].id;

        const payload = {
          address,
          roles: ['user'],
          login_method: 'wallet_auth',
          'https://hasura.io/jwt/claims': {
            'x-hasura-default-role': 'user',
            'x-hasura-allowed-roles': ['user'],
            'x-hasura-user-id': userId,
            'x-hasura-custom': 'jwt',
          },
        };

        const pkey = await readFile(
          path.resolve(__dirname, '../../credentials/private.pem')
        );

        // const pkey = Buffer.from(this.configService.get<string>('jwt.privateKey'));

        const token = await this.jwtService.signAsync(payload, {
          privateKey: pkey,
          expiresIn: '1d',
        });

        return {
          access_token: token,
        };
      }
    } catch (errors) {
      return {
        errors: {
          message: errors.toString(),
        },
      };
    }
  }
}

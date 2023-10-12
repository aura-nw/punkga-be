import { Injectable, Logger } from '@nestjs/common';
import { KMSService } from '@aura-nw/aura-kms';
import { ConfigService } from '@nestjs/config';
import { Secp256k1HdWallet } from '@cosmjs/amino';
import { GasPrice } from '@cosmjs/stargate';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { RequestService } from '../request/request.service';

@Injectable()
export class KMSBuilderService {
  private readonly logger = new Logger(KMSBuilderService.name);
  private SystemKey = null;
  private KMS: KMSService = null;

  constructor(
    private requestService: RequestService,
    private configService: ConfigService
  ) {}

  async loadKMS() {
    if (this.KMS) return this.KMS;
    const KMS_ACCESS_KEY_ID = this.configService.get<string>(
      'kms.KMS_ACCESS_KEY_ID'
    );
    const KMS_SECRET_ACCESS_KEY = this.configService.get<string>(
      'kms.KMS_SECRET_ACCESS_KEY'
    );
    const KMS_REGION = this.configService.get<string>('kms.KMS_REGION');
    const KMS_API_VERSION = this.configService.get<string>(
      'kms.KMS_API_VERSION'
    );
    return new KMSService(
      KMS_ACCESS_KEY_ID,
      KMS_SECRET_ACCESS_KEY,
      KMS_REGION,
      KMS_API_VERSION
    );
  }

  async getSeed(encryptedSeed: string) {
    const buffer = Buffer.from(encryptedSeed, 'base64');
    const keyId = 'alias/' + this.configService.get<string>('kms.alias');
    const decryptedData = await this.KMS.decrypt(keyId, buffer);

    const bufferSeed = Buffer.from(decryptedData.Plaintext, 'base64');
    const originalSeed = bufferSeed.toString('ascii');
    return originalSeed;
  }

  async getClient(wallet: Secp256k1HdWallet) {
    const rpcEndpoint = this.configService.get<string>('rpc.endpoint');
    const gasPrice = GasPrice.fromString(
      this.configService.get<string>('aura.gasprice')
    );
    return SigningCosmWasmClient.connectWithSigner(rpcEndpoint, wallet, {
      gasPrice,
    });
  }

  async transferToken(senderInfo: any, msgs: any, memo: string, token: string) {
    // try {
    const data = senderInfo.encrypt_key;
    const deserializeData = {
      type: 'secp256k1wallet-v1',
      kdf: {
        algorithm: 'argon2id',
        params: { outputLength: 32, opsLimit: 24, memLimitKib: 12288 },
      },
      encryption: { algorithm: 'xchacha20poly1305-ietf' },
      data: data,
    };
    // get secret key
    if (!this.SystemKey) {
      this.SystemKey = await this.getSystemKey(token);
    }
    const wallet = await Secp256k1HdWallet.deserialize(
      JSON.stringify(deserializeData),
      this.SystemKey
    );
    const client = await this.getClient(wallet);

    const result = await client.signAndBroadcast(
      senderInfo.wallet_address,
      msgs,
      'auto'
      // memo,
    );

    return result.transactionHash;
  }
}

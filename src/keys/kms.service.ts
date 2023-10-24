import { Injectable, Logger } from '@nestjs/common';
// import { KMSService } from '@aura-nw/aura-kms';
import { KMSService } from '@flyindance123/aura-kms';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KMSBuilderService {
  private readonly logger = new Logger(KMSBuilderService.name);
  private SystemKey = null;
  private KMS: KMSService = null;

  constructor(private configService: ConfigService) {
    this.KMS = new KMSService(
      this.configService.get<string>('kms.accessKeyId'),
      this.configService.get<string>('kms.secretAccessKey'),
      this.configService.get<string>('kms.region'),
      this.configService.get<string>('kms.apiVersion')
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

  async encryptSeed(seed: string) {
    const keyId = 'alias/' + this.configService.get<string>('kms.alias');
    const encryptedData = await this.KMS.encrypt(keyId, seed);

    return Buffer.from(encryptedData.CiphertextBlob).toString('base64');
  }

  // async getClient(wallet: Secp256k1HdWallet) {
  //   const rpcEndpoint = this.configService.get<string>('rpc.endpoint');
  //   const gasPrice = GasPrice.fromString(
  //     this.configService.get<string>('aura.gasprice')
  //   );
  //   return SigningCosmWasmClient.connectWithSigner(rpcEndpoint, wallet, {
  //     gasPrice,
  //   });
  // }

  // async transferToken(senderInfo: any, msgs: any, memo: string, token: string) {
  //   // try {
  //   const data = senderInfo.encrypt_key;
  //   const deserializeData = {
  //     type: 'secp256k1wallet-v1',
  //     kdf: {
  //       algorithm: 'argon2id',
  //       params: { outputLength: 32, opsLimit: 24, memLimitKib: 12288 },
  //     },
  //     encryption: { algorithm: 'xchacha20poly1305-ietf' },
  //     data: data,
  //   };
  //   // get secret key
  //   if (!this.SystemKey) {
  //     this.SystemKey = await this.getSystemKey(token);
  //   }
  //   const wallet = await Secp256k1HdWallet.deserialize(
  //     JSON.stringify(deserializeData),
  //     this.SystemKey
  //   );
  //   const client = await this.getClient(wallet);

  //   const result = await client.signAndBroadcast(
  //     senderInfo.wallet_address,
  //     msgs,
  //     'auto'
  //     // memo,
  //   );

  //   return result.transactionHash;
  // }
}

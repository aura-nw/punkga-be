import * as bip39 from 'bip39';
import { AES, enc } from 'crypto-js';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { KeysGraphql } from './keys.graphql';
import { KMSBuilderService } from './kms.service';
import { randomSeed } from './util';
import { JsonRpcProvider, Wallet } from 'ethers';
import { Crypter } from '../../utils/crypto';

@Injectable()
export class SysKeyService implements OnModuleInit {
  private readonly logger = new Logger(SysKeyService.name);
  private seed = '';
  private mnemonic = '';

  constructor(
    private keysGraphql: KeysGraphql,
    private kmsService: KMSBuilderService
  ) {}

  async onModuleInit() {
    // get from db
    const result = await this.keysGraphql.queryEncryptedSeed();

    if (result?.encrypted_seed) {
      const encryptedSeed = result.encrypted_seed;
      this.seed = await this.kmsService.getSeed(encryptedSeed);

      if (result.encrypted_mnemonic) {
        this.mnemonic = AES.decrypt(
          result.encrypted_mnemonic,
          this.seed
        ).toString(enc.Utf8);
      } else {
        const { mnemonic, encryptedMnemonic } = this.randomMnemonic();

        this.mnemonic = mnemonic;
        await this.keysGraphql.addEncryptedMnemonic(
          result.id,
          encryptedMnemonic
        );
      }
    } else {
      this.seed = randomSeed();
      const encryptedSeed = await this.kmsService.encryptSeed(this.seed);
      const { mnemonic, encryptedMnemonic } = this.randomMnemonic();

      this.mnemonic = mnemonic;

      await this.keysGraphql.storeEncryptedData(
        encryptedSeed,
        encryptedMnemonic
      );
    }
  }

  get originalSeed() {
    return this.seed;
  }

  async randomWallet(provider?: JsonRpcProvider) {
    const wallet = Wallet.createRandom(provider);

    const phrase = wallet.mnemonic.phrase;

    const cipherPhrase = Crypter.encrypt(phrase, this.originalSeed);
    const cipherPrvKey = Crypter.encrypt(wallet.privateKey, this.originalSeed);

    return {
      wallet,
      cipherPhrase,
      cipherPrvKey,
      address: wallet.address,
    };
  }

  cipher(value: string) {
    return Crypter.encrypt(value, this.originalSeed);
  }

  decrypt(value: string) {
    return Crypter.decrypt(value, this.originalSeed);
  }

  generateWallet() {
    const wallet = Wallet.createRandom();
    const cipherPhrase = Crypter.encrypt(
      wallet.mnemonic.phrase,
      this.originalSeed
    );
    return {
      cipherPhrase,
      address: wallet.address,
    };
  }

  randomPhrase() {
    const wallet = Wallet.createRandom();
    const cipherPhrase = Crypter.encrypt(
      wallet.mnemonic.phrase,
      this.originalSeed
    );
    return {
      cipherPhrase,
      phrase: wallet.mnemonic.phrase,
    };
  }

  private randomMnemonic() {
    const mnemonic = bip39.generateMnemonic();
    const encryptedMnemonic = AES.encrypt(mnemonic, this.seed).toString();

    return {
      mnemonic,
      encryptedMnemonic,
    };
  }
}

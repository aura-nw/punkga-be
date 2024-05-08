import * as bip39 from 'bip39';
import { AES, enc } from 'crypto-js';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { KeysGraphql } from './keys.graphql';
import { KMSBuilderService } from './kms.service';
import { randomSeed } from './util';
import { Secp256k1HdWallet, makeCosmoshubPath } from '@cosmjs/amino';

@Injectable()
export class SysKeyService implements OnModuleInit {
  private readonly logger = new Logger(SysKeyService.name);
  private seed = '';
  private mnemonic = '';

  constructor(
    private keysGraphql: KeysGraphql,
    private kmsService: KMSBuilderService
  ) { }

  async onModuleInit() {
    // get from db
    const result = await this.keysGraphql.queryEncryptedSeed();

    if (result?.encrypted_seed) {
      const encryptedSeed = result.encrypted_seed;
      this.seed = await this.kmsService.getSeed(encryptedSeed);

      if (result.encrypted_mnemonic) {
        this.mnemonic = AES.decrypt(result.encrypted_mnemonic, this.seed).toString(enc.Utf8);

      } else {
        const {
          mnemonic,
          encryptedMnemonic
        } = await this.randomMnemonic();

        this.mnemonic = mnemonic;
        await this.keysGraphql.addEncryptedMnemonic(result.id, encryptedMnemonic);
      }
    } else {
      this.seed = randomSeed();
      const encryptedSeed = await this.kmsService.encryptSeed(this.seed);
      const {
        mnemonic,
        encryptedMnemonic
      } = await this.randomMnemonic();

      this.mnemonic = mnemonic;

      await this.keysGraphql.storeEncryptedData(encryptedSeed, encryptedMnemonic);
    }
  }

  get originalSeed() {
    return this.seed;
  }

  async randomWallet() {
    const mnemonic = bip39.generateMnemonic();
    const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: 'aura',
    });

    const account = await wallet.getAccounts();
    const serializedWallet = await wallet.serialize(
      this.originalSeed
    );

    return {
      wallet,
      serializedWallet,
      account,
    };
  }

  async generateWallet(accountIndex: number) {
    const wallet = await Secp256k1HdWallet.fromMnemonic(this.mnemonic, {
      hdPaths: [makeCosmoshubPath(accountIndex)],
      prefix: 'aura',
    });

    return wallet;
  }

  private async randomMnemonic() {
    const mnemonic = bip39.generateMnemonic();
    const encryptedMnemonic = AES.encrypt(mnemonic, this.seed).toString();

    return {
      mnemonic,
      encryptedMnemonic
    }
  }
}

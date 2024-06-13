import { stripHexPrefix } from 'crypto-addr-codec';
import * as CryptoJS from 'crypto-js';

import { toBech32 } from '@cosmjs/encoding';

export class Crypter {
  public static encrypt(plainText: string, secret: string): string {
    const key = CryptoJS.enc.Utf8.parse(secret);

    const cipherText = CryptoJS.AES.encrypt(plainText, key, {
      iv: key,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return cipherText.toString();
  }

  public static decrypt(cipherText: string, secret: string): string {
    const key = CryptoJS.enc.Utf8.parse(secret);

    const decrypted = CryptoJS.AES.decrypt(cipherText, key, {
      iv: key,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  public static evmToCosmos(address: string, prefix: string) {
    const data = this.makeChecksummedHexDecoder(address);
    return toBech32(prefix, data);
  }

  private static makeChecksummedHexDecoder(data: string) {
    return Buffer.from(stripHexPrefix(data), 'hex');
  }
}

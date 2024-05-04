import {
  decodeSignature,
  serializeSignDoc,
  StdSignature,
  StdSignDoc,
} from '@cosmjs/amino';
import { Secp256k1, Secp256k1Signature, sha256 } from '@cosmjs/crypto';

import { ISlugId } from './utils.interface';
import { SiweMessage } from 'siwe';

export function detectSlugOrId(text: any): ISlugId {
  let id = 0;
  let slug = '';

  if (isNaN(text)) {
    slug = text;
  } else {
    id = Number(text);
  }

  return {
    id,
    slug,
  };
}

export async function verifySignature(signature: string, message: string) {
  // const { pubkey, signature: decodedSignature } = decodeSignature(signature);
  // const valid = await Secp256k1.verifySignature(
  //   Secp256k1Signature.fromFixedLength(decodedSignature),
  //   sha256(serializeSignDoc(signedDoc)),
  //   pubkey
  // );
  // return valid;
  // const SIWEObject = new SiweMessage(message)
}

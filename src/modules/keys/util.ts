import { randomFillSync } from 'crypto';

export const randomSeed = (
  length = 20,
  characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
) =>
  Array.from(randomFillSync(new Uint32Array(length)))
    .map((x) => characters[x % characters.length])
    .join('');

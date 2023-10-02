import { existsSync, mkdirSync } from 'fs';

export function mkdirp(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

import { existsSync, mkdirSync, writeFileSync } from 'fs';

export function writeFilesToFolder(
  files: Express.Multer.File[],
  storagePath: string
) {
  mkdirp(storagePath);

  writeFilesSync(files, storagePath);
}

export function mkdirp(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function writeFilesSync(
  files: Express.Multer.File[],
  folderPath: string
) {
  files.forEach((file) => {
    writeFileSync(`${folderPath}/${file.originalname}`, file.buffer);
  });
}

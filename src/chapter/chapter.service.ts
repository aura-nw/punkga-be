import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as decompress from 'decompress';
import { CreateChapterRequestDto } from './dto/create-chapter-request.dto';
import {
  createWriteStream,
  existsSync,
  fstat,
  mkdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import path from 'path';
import { CHAPTER_STATUS } from '../common/constant';
import { ContextProvider } from '../providers/contex.provider';

@Injectable()
export class ChapterService {
  private readonly logger = new Logger(ChapterService.name);

  async create(
    data: CreateChapterRequestDto,
    files: Array<Express.Multer.File>,
  ) {
    console.log({ data, files });
    const { userId, token } = ContextProvider.getAuthUser();
    const {
      chapter_number,
      manga_id,
      chapter_name,
      chapter_type,
      pushlish_date,
      status,
    } = data;
    const chapter_images = JSON.parse(data.chapter_images);

    const storageFolder = `./uploads/${userId}`;
    if (!existsSync(storageFolder)) {
      mkdirSync(storageFolder, { recursive: true });
    }

    files.forEach((file) => {
      writeFileSync(`./uploads/${userId}/${file.originalname}`, file.buffer);
    });

    // insert chapter to DB
    const headers = {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const variables = {
      manga_id,
      chapter_name,
      chapter_number,
      chapter_type,
      pushlish_date,
      status: CHAPTER_STATUS.UPLOADING,
      chapter_languages: chapter_images.chapter_languages.map(
        (m: { language_id: number }) => ({
          language_id: m.language_id,
          detail: null,
        }),
      ),
      thumbnail_url: '',
    };

    const response = await axios.post(
      'http://localhost:8080/v1/graphql',
      {
        query: `
          mutation AddChapter($manga_id: Int, $chapter_name: String, $chapter_number: Int, $chapter_type: String, $thumbnail_url: String = "", $chapter_languages: [chapter_languages_insert_input!] = {language_id: 10, detail: ""}, $status: String = "CREATED", $pushlish_date: timestamptz) {
            insert_chapters_one(object: {chapter_name: $chapter_name, chapter_number: $chapter_number, chapter_type: $chapter_type, thumbnail_url: $thumbnail_url, manga_id: $manga_id, status: $status, chapter_languages: {data: $chapter_languages}, pushlish_date: $pushlish_date}) {
              id
              chapter_name
              chapter_number
              pushlish_date
              status
              created_at
            }
          }
        `,
        variables,
        operationName: 'AddChapter',
      },
      { headers },
    );

    return response.data;

    // await this.handleUpload(ctx, storageFolder);
  }

  unzipFile(file: Buffer, outputPath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      decompress(file, outputPath)
        .then((files: decompress.File[]) => {
          console.log('Files unzipped successfully', files.length);
          return resolve(true);
        })
        .catch((error: Error) => {
          console.log(error);
          return reject(error);
        });
    });
  }
}

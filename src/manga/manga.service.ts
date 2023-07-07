import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateMangaRequestDto,
  MangaCreator,
  MangaLanguage,
  MangaTag,
} from './dto/create-manga-request.dto';
import { ContextProvider } from '../providers/contex.provider';
import { plainToInstance } from 'class-transformer';
import { readFileSync } from 'fs';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import axios from 'axios';

@Injectable()
export class MangaService {
  private readonly logger = new Logger(MangaService.name);

  constructor(private configService: ConfigService) {}

  async create(data: CreateMangaRequestDto, files: Array<Express.Multer.File>) {
    const { token } = ContextProvider.getAuthUser();
    const { status } = data;
    const manga_tags = plainToInstance(
      MangaTag,
      JSON.parse(data.manga_tags) as any[],
    );
    const manga_creators = plainToInstance(
      MangaCreator,
      JSON.parse(data.manga_creators) as any[],
    );
    const manga_languages = plainToInstance(
      MangaLanguage,
      JSON.parse(data.manga_languages) as any[],
    );

    // insert manga to DB
    const headers = {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const variables = {
      status,
      manga_tags,
      manga_creators,
      manga_languages,
    };

    const response = await axios.post(
      'http://localhost:8080/v1/graphql',
      {
        query: `
        mutation CreateNewManga($status: String = "", $banner: String = "", $poster: String = "", $manga_languages: [manga_languages_insert_input!] = {language_id: 10, is_main_language: false, description: "", title: ""}, $manga_creators: [manga_creator_insert_input!] = {creator_id: 10}, $manga_tags: [manga_tag_insert_input!] = {tag_id: 10}) {
          insert_manga_one(object: {status: $status, manga_creators: {data: $manga_creators}, banner: $banner, poster: $poster, manga_languages: {data: $manga_languages}, manga_tags: {data: $manga_tags}}) {
            id
            created_at
            status
          }
        }        
        `,
        variables,
        operationName: 'CreateNewManga',
      },
      { headers },
    );

    if (response.data.errors && response.data.errors.length > 0) {
      return response.data;
    }

    const mangaId = response.data.data.insert_manga_one.id;

    const bannerFile = files.filter((f) => f.fieldname === 'banner')[0];
    const bannerUrl = await this.uploadImageToS3(mangaId, bannerFile);

    const posterFile = files.filter((f) => f.fieldname === 'poster')[0];
    const posterUrl = await this.uploadImageToS3(mangaId, posterFile);

    // update manga in DB
    const udpateVariables = {
      id: mangaId,
      banner: bannerUrl,
      poster: posterUrl,
    };

    const updateResponse = await axios.post(
      'http://localhost:8080/v1/graphql',
      {
        query: `
        mutation UpdateMangaByPK($banner: String = "", $poster: String = "", $id: Int = 10) {
          update_manga_by_pk(pk_columns: {id: $id}, _set: {banner: $banner, poster: $poster}) {
            id
            banner
            poster
            status
            created_at
          }
        }               
        `,
        variables: udpateVariables,
        operationName: 'UpdateMangaByPK',
      },
      { headers },
    );

    return updateResponse.data;
  }

  async uploadImageToS3(
    mangaId: number,
    f: Express.Multer.File,
  ): Promise<string> {
    // upload file to s3
    if (!f.mimetype.includes('image')) {
      throw Error('file type is not valid');
    }
    const keyName = `manga-${mangaId}/${f.fieldname}.${f.originalname
      .split('.')
      .pop()}`;

    await this.uploadToS3(keyName, f.buffer);
    return new URL(keyName, this.configService.get<string>('aws.queryEndpoint'))
      .href;
  }

  async uploadToS3(keyName: string, filePath: string | Buffer) {
    const file =
      typeof filePath === 'string' ? readFileSync(filePath) : filePath;

    const client = new S3Client({
      region: this.configService.get<string>('aws.region'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws.keyid'),
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey'),
      },
    });

    const bucketName = this.configService.get<string>('aws.bucketName');

    // Create a promise on S3 service object
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: keyName,
      Body: file,
    });
    return client.send(command);
  }
}

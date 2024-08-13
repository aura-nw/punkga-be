import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ChapterGraphql {
  constructor(
    private configService: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async getChapterInfo(token: string, id: number) {
    const chapter = await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `query GetChapterInfo($id: Int!) {
        chapters_by_pk(id: $id) {
          chapter_id
          chapter_number
          thumbnail_url
          chapter_languages {
            detail
            language_id
          }
        }
      }`,
      'GetChapterInfo',
      {
        id,
      }
    );
    if (!chapter.data.chapters_by_pk || chapter.data.chapters_by_pk === null) {
      throw Error('Not found');
    }

    return chapter.data.chapters_by_pk;
  }

  async createChapter(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `mutation AddChapter($manga_id: Int, $chapter_name: String, $chapter_number: Int, $chapter_type: String, $thumbnail_url: String = "", $status: String = "CREATED", $pushlish_date: timestamptz) {
      insert_chapters_one(object: {chapter_name: $chapter_name, chapter_number: $chapter_number, chapter_type: $chapter_type, thumbnail_url: $thumbnail_url, manga_id: $manga_id, status: $status, pushlish_date: $pushlish_date}) {
        id
        chapter_name
        chapter_number
        pushlish_date
        status
        thumbnail_url
        created_at
      }
    }`,
      'AddChapter',
      variables
    );
  }

  async updateChapter(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateChapterByPK($id: Int!, $chapter_name: String, $chapter_number: Int, $chapter_type: String, $thumbnail_url: String, $status: String = "", $pushlish_date: timestamptz = "") {
      update_chapters_by_pk(pk_columns: {id: $id}, _set: {chapter_name: $chapter_name, chapter_type: $chapter_type, thumbnail_url: $thumbnail_url, chapter_number: $chapter_number, status: $status, pushlish_date: $pushlish_date}) {
        id
        chapter_name
        chapter_number
        chapter_type
        thumbnail_url
        updated_at
        manga_id
      }
    }`,
      'UpdateChapterByPK',
      variables
    );
  }

  insertUpdateChapterLanguages(
    token: string,
    chapterId: number,
    data: {
      languageId: number;
      detail: any;
    }[]
  ) {
    const variables = {
      chapter_languages: data.map((chapterLanguage) => ({
        chapter_id: chapterId,
        language_id: chapterLanguage.languageId,
        detail: chapterLanguage.detail,
      })),
    };

    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `mutation InsertChapterLanguages($chapter_languages: [chapter_languages_insert_input!] = {chapter_id: 10, language_id: 10, detail: ""}) {
        insert_chapter_languages(objects: $chapter_languages, on_conflict: {constraint: chapter_languages_chapter_id_language_id_key, update_columns: detail}) {
          affected_rows
        }
      }`,
      'InsertChapterLanguages',
      variables
    );
  }

  getMangaIdByChapterId(token: string, chapterId: number) {
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `query GetMangaIdByChapterId($id: Int = 10) {
        chapters(where: {id: {_eq: $id}}) {
          manga_id
          chapter_type
          chapter_languages(where: {chapter: {status: {_eq: "Published"}}}) {
            language_id
            detail
          }
        }
      }`,
      'GetMangaIdByChapterId',
      {
        id: chapterId,
      }
    );
  }

  createChapterCollection(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configService.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      "",
      `mutation insert_chapter_collection($objects: [chapter_collection_insert_input!] = {}) {
        insert_chapter_collection(objects: $objects, on_conflict: {constraint: chapter_collection_chapter_id_launchpad_id_key, update_columns: chapter_id}) {
          affected_rows
          returning {
            chapter_id
            created_at
            id
            launchpad_id
          }
        }
      }`,
      'insert_chapter_collection',
      variables,
      headers
    );
  }
}

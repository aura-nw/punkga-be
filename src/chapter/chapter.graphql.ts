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
          manga_id
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

  updateChapterLanguages(
    token: string,
    chapterId: number,
    data: {
      languageId: number;
      detail: any;
    }[]
  ) {
    return data.map((chapterLanguage) => {
      return this.graphqlSvc.query(
        this.configService.get<string>('graphql.endpoint'),
        token,
        `mutation UpdateChapterLanguague($chapter_id: Int!, $language_id: Int!, $detail: jsonb! = "") {
          insert_chapter_languages(objects: {chapter_id: $chapter_id, language_id: $language_id, detail: $detail}, on_conflict: {constraint: chapter_languages_chapter_id_language_id_key, update_columns: detail}) {
            affected_rows
          }
        }`,
        'UpdateChapterLanguague',
        {
          chapter_id: chapterId,
          language_id: chapterLanguage.languageId,
          detail: chapterLanguage.detail,
        }
      );
    });
  }
}

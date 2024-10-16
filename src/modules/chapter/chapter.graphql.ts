import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChapterStatus } from '../../common/enum';

@Injectable()
export class ChapterGraphql {
  private logger: Logger = new Logger(ChapterGraphql.name);

  constructor(
    private configService: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  async deactiveChapter(chapterId: number) {
    const headers = {
      'x-hasura-admin-secret': this.configService.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `mutation update_chapters_by_pk($id: Int!, $status: String!) {
        update_chapters_by_pk(pk_columns: {id: $id}, _set: {status: $status}) {
          id
          status
        }
      }
      `,
      'update_chapters_by_pk',
      {
        id: chapterId,
        status: ChapterStatus.Inactive,
      },
      headers
    );
  }

  async verifyChapterOwner(variables: any) {
    const result = await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `query chapters_by_pk($creator_id: Int!, $chapter_id: Int!) {
        chapters_by_pk(id: $chapter_id) {
          id
          manga {
            manga_creators(where: {creator_id: {_eq: $creator_id}}) {
              id
            }
          }
        }
      }`,
      'chapters_by_pk',
      variables
    );

    if (result.errors) {
      this.logger.error(JSON.stringify(result));
      return false;
    }
    if (!result.data.chapters_by_pk || result.data.chapters_by_pk === null) {
      return false;
    }

    if (result.data.chapters_by_pk.manga.manga_creators.length === 0) {
      return false;
    }

    return true;
  }

  async getChapterInfo(token: string, id: number) {
    const chapter = await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `query GetChapterInfo($id: Int!) {
        chapters_by_pk(id: $id) {
          id
          chapter_number
          thumbnail_url
          chapter_languages {
            detail
            language_id
          }
          chapter_collections {
            chapter_collection {
              contract_address
            }
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

  adminCreateChapterCollection(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configService.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
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

  queryErc721Tokens(token: string, network: string, variables: any) {
    return this.graphqlSvc.query(
      this.configService.get<string>('horosope.endpoint'),
      token,
      `query QueryCw721Tokens($owner: String = "", $smart_contracts: [String!] = "") {
        ${network} {
          erc721_contract(where: {evm_smart_contract: {address: {_in: $smart_contracts}}}) {
            evm_smart_contract {
              id
            }
            erc721_tokens(where: {owner: {_eq: $owner}}) {
              owner
              token_id
            }
          }
        }
      }`,
      'QueryCw721Tokens',
      variables
    );
  }

  async queryUserAddress(token: string): Promise<string> {
    const result = await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      token,
      `query GetUserProfile {
        authorizer_users(limit: 1) {
          id
          email
          email_verified_at
          bio
          birthdate
          gender
          active_wallet_address: active_evm_address
          wallet_address
          nickname
          picture
          signup_methods
          levels {
            xp
            level
            user_level_chain {
              id
              name
              punkga_config
            }
          }
          authorizer_users_user_wallet {
            address
          }
          user_quests_aggregate {
            aggregate {
              count
            }
          }
          user_quests(order_by: {created_at:desc}, limit: 20) {
            created_at
            status
            user_quest_rewards {
              tx_hash
            }
            quest {
              id
              name
              quests_campaign {
                campaign_chain {
                  punkga_config
                }
              }
              quests_i18n {
                id
                quest_id
                language_id
                data
                i18n_language {
                  id
                  description
                  icon
                  is_main
                  symbol
                }
              }
              reward
            }
          }
        }
      }
      `,
      'GetUserProfile',
      {}
    );

    if (result.data.authorizer_users[0]?.active_wallet_address) {
      return result.data.authorizer_users[0]?.active_wallet_address;
    } else {
      throw new NotFoundException('wallet address not found');
    }
  }

  async adminCreateChapter(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configService.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `mutation AddChapter($manga_id: Int, $chapter_name: String, $chapter_number: Int, $chapter_type: String, $thumbnail_url: String = "", $status: String = "CREATED", $pushlish_date: timestamptz, $story_submission_id: Int!) {
        insert_chapters_one(object: {chapter_name: $chapter_name, chapter_number: $chapter_number, chapter_type: $chapter_type, thumbnail_url: $thumbnail_url, manga_id: $manga_id, status: $status, pushlish_date: $pushlish_date, story_submission_id: $story_submission_id}) {
          id
          chapter_name
          chapter_number
          pushlish_date
          status
          thumbnail_url
          created_at
          story_submission_id
        }
      }
      `,
      'AddChapter',
      variables,
      headers
    );
  }

  async adminUpdateChapter(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configService.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `mutation UpdateChapterByPK($id: Int!, $chapter_name: String, $chapter_number: Int, $chapter_type: String, $thumbnail_url: String, $status: String = "", $pushlish_date: timestamptz = "", $story_submission_id: Int!) {
        update_chapters_by_pk(pk_columns: {id: $id}, _set: {chapter_name: $chapter_name, chapter_type: $chapter_type, thumbnail_url: $thumbnail_url, chapter_number: $chapter_number, status: $status, pushlish_date: $pushlish_date, story_submission_id: $story_submission_id}) {
          id
          chapter_name
          chapter_number
          chapter_type
          thumbnail_url
          story_submission_id
          updated_at
          manga_id
        }
      }`,
      'UpdateChapterByPK',
      variables,
      headers
    );
  }

  adminInsertUpdateChapterLanguages(
    chapterId: number,
    data: {
      languageId: number;
      detail: any;
    }[]
  ) {
    const headers = {
      'x-hasura-admin-secret': this.configService.get<string>(
        'graphql.adminSecret'
      ),
    };
    const variables = {
      chapter_languages: data.map((chapterLanguage) => ({
        chapter_id: chapterId,
        language_id: chapterLanguage.languageId,
        detail: chapterLanguage.detail,
      })),
    };

    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `mutation InsertChapterLanguages($chapter_languages: [chapter_languages_insert_input!] = {chapter_id: 10, language_id: 10, detail: ""}) {
        insert_chapter_languages(objects: $chapter_languages, on_conflict: {constraint: chapter_languages_chapter_id_language_id_key, update_columns: detail}) {
          affected_rows
        }
      }`,
      'InsertChapterLanguages',
      variables,
      headers
    );
  }

  async updateChapterStatus(chapterId: number, status: string) {
    const headers = {
      'x-hasura-admin-secret': this.configService.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `mutation UpdateChapterByPK($id: Int!, $status: String = "") {
      update_chapters_by_pk(pk_columns: {id: $id}, _set: {status: $status}) {
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
      { id: chapterId, status },
      headers
    );
  }
}

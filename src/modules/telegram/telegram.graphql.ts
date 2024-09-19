import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TelegramGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) { }

  getChapterDetail(variables) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query GetChapterReadingDetail($manga_slug: String = "", $chapter_number: Int!) {
        chapters(where: {_and: {chapter_number: {_eq: $chapter_number}, manga: {_and: {slug: {_eq: $manga_slug}, status: {_in: ["On-Going", "Finished"]}}}}}) {
          id
          chapter_number
          chapter_name
          chapter_type
          thumbnail_url
          status
          pushlish_date
          chapter_languages(where: {chapter: {status: {_eq: "Published"}}}) {
            language_id
            detail
          }
          comments: social_activities_aggregate {
            aggregate {
              count
            }
          }
          views
          chapters_likes_aggregate {
            aggregate {
              count
            }
          }
        }
      }
      `,
      'GetChapterReadingDetail',
      variables,
      headers
    );
  }

  getTelegramUser(variables) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query telegram_users_by_pk($id: Int!) {
        telegram_user: telegram_users_by_pk(id: $id) {
          id
          telegram_id
          username
          created_at
          chip
          authorizer_user {
            id
            nickname
            email
          }
        }
      }`,
      'telegram_users_by_pk',
      variables,
      headers
    );
  }

  saveDonateHistory(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_donate_history_one($object: donate_history_insert_input = {}) {
        insert_donate_history_one(object: $object) {
          telegram_user {
            telegram_id
            username
            authorizer_user {
              id
              nickname
            }
          }
          creator {
            id
            gender
            name
            avatar_url
            pen_name
            email
          }
          txn
          value
        }
      }
      `,
      'insert_donate_history_one',
      variables,
      headers
    );
  }

  updateTelegramUser(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_telegram_users_by_pk($id: Int!, $user_id: bpchar!) {
        telegram_user: update_telegram_users_by_pk(pk_columns: {id: $id}, _set: {user_id: $user_id}) {
          id
          telegram_id
          username
          authorizer_user {
            id
            nickname
            email
          }
        }
      }`,
      'update_telegram_users_by_pk',
      variables,
      headers
    );
  }

  getTelegramQuest(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query telegram_quests($telegram_user_id: Int!) {
        telegram_quests {
          id
          quest_name
          quest_url
          reward
          social_source
          type
          claim_after
          active_from
          active_to
          activated
          deleted
          telegram_quest_histories(where: {telegram_user: {id: {_eq: $telegram_user_id}}}) {
            id
            quest_id
            created_date
            is_claim
            telegram_user {
              id
              telegram_id
              chip
              authorizer_user {
                email
              }
            }
          }
        }
      }`,
      'telegram_quests',
      variables,
      headers
    );
  }

  getTelegramQuestById(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query telegram_quests($id: bigint!, $telegram_user_id: Int!) {
        telegram_quests(where: {id: {_eq: $id}}) {
          id
          quest_name
          quest_url
          reward
          social_source
          type
          claim_after
          active_from
          active_to
          activated
          deleted
          telegram_quest_histories(where: {telegram_user: {id: {_eq: $telegram_user_id}}}) {
            id
            quest_id
            created_date
            is_claim
            telegram_user {
              id
              telegram_id
              chip
              authorizer_user {
                email
              }
            }
          }
        }
      }`,
      'telegram_quests',
      variables,
      headers
    );
  }
  insertTelegramQuestHistory(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_telegram_quest_history($quest_id: bigint!, $telegram_user_id: Int!, $is_claim: Boolean!) {
        insert_telegram_quest_history(objects: {quest_id: $quest_id, telegram_user_id: $telegram_user_id, is_claim: $is_claim}) {
          returning {
            id
            quest_id
            telegram_user_id
            is_claim
            created_date
          }
        }
      }`,
      'insert_telegram_quest_history',
      variables,
      headers
    );
  }
  updateTelegramQuestHistory(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_telegram_quest_history($quest_id: bigint!, $telegram_user_id: Int!) {
        update_telegram_quest_history(where: {quest_id: {_eq: $quest_id}, telegram_user_id: {_eq: $telegram_user_id}}, _set: {is_claim: true}) {
          returning {
            id
            quest_id
            telegram_user_id
            is_claim
            created_date
          }
        }
      }`,
      'update_telegram_quest_history',
      variables,
      headers
    );
  }
  updateTelegramUserChip(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_telegram_users($telegram_user_id: Int!, $chip: bigint!) {
         update_telegram_users(where: {id: {_eq: $telegram_user_id}}, _set: {chip: $chip}) {
         returning {
            id
            telegram_id
            username
            created_at
            chip
            authorizer_user {
              id
              nickname
              email
            }
          }
         }
      }`,
      'update_telegram_users',
      variables,
      headers
    );
  }
  insertTempAuthorizedUser(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_authorizer_users($id: bpchar!, $key: String!, $email: String!, $email_verified_at: bigint!, $nickname: String!, $signup_methods: String!) {
          insert_authorizer_users(objects: {id: $id, key: $key, email: $email, email_verified_at: $email_verified_at, signup_methods: $signup_methods, nickname: $nickname}) {
            returning {
              id
            }
          }
        }
        `,
      'insert_authorizer_users',
      variables,
      headers
    );
  }
}

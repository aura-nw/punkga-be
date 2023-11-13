import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class MangaGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  queryMangaByIdOrSlug(variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query QueryMangaByIdOrSlug ($user_id: bpchar = "", $slug: String = "", $id: Int = 0) {
        manga(where: {_and: {_or: [{id: {_eq: $id}}, {slug: {_eq: $slug}}]}, status: {_neq: "Removed"}}) {
          id
          slug
          poster
          banner
          contract_addresses
          status
          release_date
          manga_creators {
            creator {
              id
              slug
              name
              pen_name
              isActive
            }
          }
          manga_total_likes {
            likes
          }
          manga_total_views {
            views
          }
          manga_languages {
            title
            description
            is_main_language
            language_id
          }
          chapters_aggregate {
            aggregate {
              count
            }
          }
          chapters(order_by: {chapter_number:desc_nulls_last}, where: {status:{_neq:"Inactive"}}) {
            id
            chapter_number
            chapter_name
            chapter_type
            thumbnail_url
            pushlish_date
            status
            views
            chapter_total_likes {
              likes
            }
            chapters_likes(where: {user_id:{_eq:$user_id}}) {
              id
              created_at
            }
          }
          manga_subscribers_aggregate {
            aggregate {
              count
            }
          }
          manga_tags(limit: 5) {
            tag {
              id
              tag_languages {
                language_id
                value
              }
            }
          }
          manga_subscribers(where: {user_id:{_eq:$user_id}}) {
            id
            created_at
          }
        }
      }
      `,
      'QueryMangaByIdOrSlug',
      variables
    );
  }

  getChapterReadingDetail(variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query GetChapterReadingDetail($manga_slug: String = "", $manga_id: Int = 0, $chapter_number: Int = 1, $user_id: bpchar = "") {
        chapters(where: {_and: {chapter_number: {_eq: $chapter_number}, manga: {_and: {_or: [{slug: {_eq: $manga_slug}}, {id: {_eq: $manga_id}}], status: {_in: ["On-Going", "Finished"]}}}}}) {
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
          chapters_likes(where: {user_id: {_eq: $user_id}}) {
            id
            created_at
            user_id
            chapter_id
          }
        }
      }
      `,
      'GetChapterReadingDetail',
      variables
    );
  }

  createNewManga(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation CreateNewManga($status: String = "", $contract_addresses: jsonb = "", $banner: String = "", $poster: String = "", $manga_languages: [manga_languages_insert_input!] = {language_id: 10, is_main_language: false, description: "", title: ""}, $manga_creators: [manga_creator_insert_input!] = {creator_id: 10}, $manga_tags: [manga_tag_insert_input!] = {tag_id: 10}, $release_date: timestamptz = "") {
        insert_manga_one(object: {status: $status, contract_addresses: $contract_addresses, manga_creators: {data: $manga_creators}, banner: $banner, poster: $poster, manga_languages: {data: $manga_languages}, manga_tags: {data: $manga_tags}, release_date: $release_date}) {
          id
          created_at
          status
          release_date
        }
      }`,
      'CreateNewManga',
      variables
    );
  }

  updateMangaByPK(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateMangaByPK($banner: String = "", $poster: String = "", $id: Int = 10, $slug: String = "") {
        update_manga_by_pk(pk_columns: {id: $id}, _set: {banner: $banner, poster: $poster, slug: $slug}) {
          id
          banner
          poster
          status
          contract_addresses
          created_at
        }
      }`,
      'UpdateMangaByPK',
      variables
    );
  }

  queryMangaById(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query QueryMangaById($id: Int = 10) {
        manga_by_pk(id: $id) {
          id
          poster
          banner
          contract_addresses
        }
      }`,
      'QueryMangaById',
      variables
    );
  }

  updateManga(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateManga($manga_id: Int!, $status: String!, $contract_addresses: jsonb = "", $banner: String!, $poster: String!, $manga_languages: [manga_languages_insert_input!] = {language_id: 10, is_main_language: false, description: "", title: ""}, $manga_creators: [manga_creator_insert_input!] = {creator_id: 10}, $manga_tags: [manga_tag_insert_input!] = {tag_id: 10}, $release_date: timestamptz = "") {
        delete_manga_tag(where: {manga_id: {_eq: $manga_id}}) {
          affected_rows
        }
        delete_manga_creator(where: {manga_id: {_eq: $manga_id}}) {
          affected_rows
        }
        delete_manga_languages(where: {manga_id: {_eq: $manga_id}}) {
          affected_rows
        }
        insert_manga_one(object: {status: $status, contract_addresses: $contract_addresses, manga_creators: {data: $manga_creators}, banner: $banner, poster: $poster, manga_languages: {data: $manga_languages}, manga_tags: {data: $manga_tags}, id: $manga_id, release_date: $release_date}, on_conflict: {constraint: manga_pkey, update_columns: [banner, poster, status, release_date, contract_addresses]}) {
          id
          banner
          poster
          status
          release_date
          created_at
          manga_creators {
            creator_id
          }
          manga_languages {
            language_id
            title
            is_main_language
            description
          }
          manga_tags {
            tag_id
          }
        }
      }
      `,
      'UpdateManga',
      variables
    );
  }

  async queryUserAddress(token: string): Promise<string> {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query QueryUserAddress {
        authorizer_users {
          authorizer_users_user_wallet {
            address
          }
        }
      }
      `,
      'QueryUserAddress',
      {}
    );

    if (result.data.authorizer_users[0]?.authorizer_users_user_wallet.address) {
      return result.data.authorizer_users[0]?.authorizer_users_user_wallet
        .address;
    } else {
      throw new NotFoundException();
    }
  }

  queryMangaContractAddr(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query QueryMangaContractAddr($id: Int!) {
          manga_by_pk(id: $id) {
            contract_addresses
          }
        }`,
      'QueryMangaContractAddr',
      variables
    );
  }

  queryCw721Tokens(token: string, network: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('horosope.endpoint'),
      token,
      `query QueryCw721Tokens($owner: String = "", $smart_contracts: [String!] = "") {
      ${network} {
        cw721_contract(where: {smart_contract: {address: {_in: $smart_contracts}}}) {
          id
          cw721_tokens(where: {burned: {_eq: false}, owner: {_eq: $owner}}) {
            token_id
          }
        }
      }
    }`,
      'QueryCw721Tokens',
      variables
    );
  }
}

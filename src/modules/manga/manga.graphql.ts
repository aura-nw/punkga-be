import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MangaStatus } from '../../common/enum';

@Injectable()
export class MangaGraphql {
  private logger: Logger = new Logger(MangaGraphql.name);

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
          status
          release_date
          manga_collections {
            launchpad_id
            manga_id
            manga_collection {
              featured_images
              contract_address
              launchpad_creator {
                name
                slug
                id
              }
              launchpad_i18ns {
                data(path: "name")
                language_id
                id
              }
              slug
              status
              updated_at
              created_at
            }
            id
          }
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
          chapter_collections {
            chapter_collection {
              featured_images
              contract_address
              launchpad_creator {
                name
                slug
                id
              }
              launchpad_i18ns {
                data(path: "name")
                language_id
                id
              }
              slug
              status
              updated_at
              created_at
            }
          }
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
          status
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
      throw new NotFoundException('wallet address not found');
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

  queryErc721Tokens(token: string, network: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('horosope.endpoint'),
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

  adminCreateMangaCollection(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation insert_manga_collection($objects: [manga_collection_insert_input!] = {}) {
        insert_manga_collection(objects: $objects, on_conflict: {constraint: manga_collection_manga_id_launchpad_id_key, update_columns: updated_at}) {
          affected_rows
        }
      }`,
      'insert_manga_collection',
      variables,
      headers
    );
  }

  async verifyMangaOwner(variables: any) {
    const result = await this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query manga_by_pk($creator_id: Int!, $manga_id: Int!) {
        manga_by_pk(id: $manga_id) {
          id
          manga_creators(where: {creator_id: {_eq: $creator_id}}) {
            id
          }
        }
      }
      `,
      'manga_by_pk',
      variables
    );

    if (result.errors) {
      this.logger.error(JSON.stringify(result));
      return false;
    }
    if (!result.data.manga_by_pk || result.data.manga_by_pk === null) {
      return false;
    }

    if (result.data.manga_by_pk.manga_creators.length === 0) {
      return false;
    }

    return true;
  }

  async removeManga(mangaId: number) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_manga_by_pk($id: Int!, $status: String!) {
        update_manga_by_pk(pk_columns: {id: $id}, _set: {status: $status}) {
          id
          status
        }
      }
      `,
      'update_manga_by_pk',
      {
        id: mangaId,
        status: MangaStatus.Removed,
      },
      headers
    );
  }

  adminCreateNewManga(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation CreateNewManga($status: String = "", $contract_addresses: jsonb = "", $banner: String = "", $poster: String = "", $manga_languages: [manga_languages_insert_input!] = {language_id: 10, is_main_language: false, description: "", title: ""}, $manga_creators: [manga_creator_insert_input!] = {creator_id: 10}, $manga_tags: [manga_tag_insert_input!] = {tag_id: 10}, $release_date: timestamptz = "", $age_limit: Int = 0, $finished: Int = 0) {
        insert_manga_one(object: {status: $status, contract_addresses: $contract_addresses, manga_creators: {data: $manga_creators}, banner: $banner, poster: $poster, manga_languages: {data: $manga_languages}, manga_tags: {data: $manga_tags}, release_date: $release_date, finished: $finished, age_limit: $age_limit}) {
          id
          created_at
          status
          release_date
        }
      }`,
      'CreateNewManga',
      variables,
      headers
    );
  }

  // adminUpdateMangaByPK(id: number, object: any) {
  //   const headers = {
  //     'x-hasura-admin-secret': this.configSvc.get<string>(
  //       'graphql.adminSecret'
  //     ),
  //   };
  //   const variables = { id, object };
  //   return this.graphqlSvc.query(
  //     this.configSvc.get<string>('graphql.endpoint'),
  //     '',
  //     `mutation UpdateMangaByPK($id: Int!, $object: manga_set_input!) {
  //       update_manga_by_pk(pk_columns: {id: $id}, _set: $object) {
  //         id
  //         banner
  //         poster
  //         status
  //         contract_addresses
  //         created_at
  //       }
  //     }`,
  //     'UpdateMangaByPK',
  //     variables,
  //     headers
  //   );
  // }
  adminUpdateManga(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation UpdateManga($manga_id: Int!, $status: String!, $contract_addresses: jsonb = "", $banner: String!, $poster: String!, $manga_languages: [manga_languages_insert_input!] = {language_id: 10, is_main_language: false, description: "", title: ""}, $manga_creators: [manga_creator_insert_input!] = {creator_id: 10}, $manga_tags: [manga_tag_insert_input!] = {tag_id: 10}, $release_date: timestamptz = "", $age_limit: Int = 0, $finished: Int = 0) {
        delete_manga_tag(where: {manga_id: {_eq: $manga_id}}) {
          affected_rows
        }
        delete_manga_creator(where: {manga_id: {_eq: $manga_id}}) {
          affected_rows
        }
        delete_manga_languages(where: {manga_id: {_eq: $manga_id}}) {
          affected_rows
        }
        insert_manga_one(object: {status: $status, contract_addresses: $contract_addresses, manga_creators: {data: $manga_creators}, banner: $banner, poster: $poster, manga_languages: {data: $manga_languages}, manga_tags: {data: $manga_tags}, id: $manga_id, release_date: $release_date, finished: $finished, age_limit: $age_limit}, on_conflict: {constraint: manga_pkey, update_columns: [banner, poster, status, release_date, contract_addresses, finished, age_limit]}) {
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
      variables,
      headers
    );
  }

  async updateMangaStatus(mangaId: number, status: string) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };

    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation update_manga_by_pk($id: Int!, $status: String!) {
        update_manga_by_pk(pk_columns: {id: $id}, _set: {status: $status}) {
          id
          status
        }
      }
      `,
      'update_manga_by_pk',
      {
        id: mangaId,
        status,
      },
      headers
    );
  }

  async queryMangaListForCreator(
    creator_id: number,
    keyword: string,
    limit: number,
    offset: number
  ) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    if (keyword) {
      keyword = `%${keyword}%`;
    }
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query manga($keyword: String = "%%", $limit: Int = 10, $offset: Int = 0, $creator_id: Int!) {
        manga(where: {_or: [{manga_languages: {title: {_ilike: $keyword}}}, {manga_creators: {creator: {pen_name: {_ilike: $keyword}}}}], manga_creators: {creator: {id: {_eq: $creator_id}}}}, order_by: {publish_date: desc}, limit: $limit, offset: $offset) {
          id
          slug
          publish_date
          status
          is_active
          finished
          age_limit
          manga_languages {
            title
          }
          manga_creators {
            creator {
              name
              pen_name
              slug
              id
            }
          }
        }
        manga_aggregate(where: {_or: [{manga_languages: {title: {_ilike: $keyword}}}, {manga_creators: {creator: {pen_name: {_ilike: $keyword}}}}], manga_creators: {creator: {id: {_eq: $creator_id}}}}) {
          aggregate {
            count(columns: id)
          }
        }
      }
      `,
      'manga',
      { keyword, creator_id, limit, offset },
      headers
    );
  }
  
  async queryMangaListForAdmin(
    status: string[],
    keyword: string,
    limit: number,
    offset: number
  ) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    if (keyword) {
      keyword = `%${keyword}%`;
    }
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query manga($keyword: String = "%%", $limit: Int = 10, $offset: Int = 0, $status: [String] = ["Upcoming", "On-going", "Published", "Removed", "Waiting For Approval", "Rejected"]) {
        manga(where: {status: {_in: $status}, _or: [{manga_languages: {title: {_ilike: $keyword}}}, {manga_creators: {creator: {pen_name: {_ilike: $keyword}}}}]}, order_by: {publish_date: desc}, limit: $limit, offset: $offset) {
          id
          slug
          publish_date
          status
          manga_languages {
            title
          }
          manga_creators {
            creator {
              name
              pen_name
              slug
              id
            }
          }
          chapters_aggregate {
            aggregate {
              count
              max {
                chapter_number
              }
            }
          }
          published_chapters_aggregate: chapters_aggregate(where: {status: {_eq: "Published"}}) {
            aggregate {
              count
            }
          }
          manga_languages {
            id
            title
            language_id
            is_main_language
          }
          created_at
          release_date
          is_active
          finished
          age_limit
        }
        manga_aggregate(where: {status: {_in: $status}, _or: [{manga_languages: {title: {_ilike: $keyword}}}, {manga_creators: {creator: {pen_name: {_ilike: $keyword}}}}]}) {
          aggregate {
            count(columns: id)
          }
        }
      }
      `,
      'manga',
      { keyword, status, limit, offset },
      headers
    );
  }

  adminUpdateMangaByPK(variables: any) {
    const headers = {
      'x-hasura-admin-secret': this.configSvc.get<string>(
        'graphql.adminSecret'
      ),
    };
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
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
      variables,
      headers
    );
  }
}

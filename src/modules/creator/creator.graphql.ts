import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CreatorGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) { }

  queryCreatorByIdOrSlug(variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query QueryCreatorByIdOrSlug($id: Int = 0, $slug: String = "") {
        creators(where: {_or: [{id: {_eq: $id}}, {slug: {_eq: $slug}}]}) {
          id
          slug
          avatar_url
          bio
          dob
          gender
          name
          pen_name
          socials
          total_subscribers
          isActive
          wallet_address
          created_at
          manga_creators(where: {manga: {status: {_neq: "Removed"}}}) {
            manga {
              id
              slug
              status
              poster
              banner
              manga_creators {
                creator {
                  name
                  pen_name
                  id
                  slug
                }
              }
              manga_total_likes {
                likes
              }
              manga_total_views {
                views
              }
              manga_tags {
                tag {
                  tag_languages {
                    language_id
                    value
                  }
                  id
                }
              }
              chapters(limit: 1, order_by: {chapter_number: desc}, where: {status: {_eq: "Published"}}) {
                id
                chapter_number
                chapter_name
              }
              contract_addresses
              manga_languages {
                id
                is_main_language
                title
                description
                language_id
              }
            }
          }
        }
      }
      `,
      'QueryCreatorByIdOrSlug',
      variables
    );
  }

  addCreator(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation AddCreator($name: String, $bio: String, $socials: jsonb = null, $pen_name: String = "", $profile_picture: String = "", $gender: String = "", $dob: String = "", $avatar_url: String = "", $wallet_address: String = "") {
        insert_creators_one(object: {name: $name, bio: $bio, socials: $socials, pen_name: $pen_name, gender: $gender, dob: $dob, avatar_url: $avatar_url, wallet_address: $wallet_address}) {
          id
          name
          socials
          created_at
          bio
        }
      }`,
      'AddCreator',
      variables
    );
  }

  updateSlugAndAvatar(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateSlugAndAvatar($id: Int = 10, $avatar_url: String = "", $slug: String = "") {
      update_creators_by_pk(pk_columns: {id: $id}, _set: {avatar_url: $avatar_url, slug: $slug}) {
        id
        avatar_url
      }
    }
    `,
      'UpdateSlugAndAvatar',
      variables
    );
  }

  queryCreatorById(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `query QueryCreatorById($id: Int!) {
        creators_by_pk(id: $id) {
          id
          avatar_url
        }
      }
      `,
      'QueryCreatorById',
      variables
    );
  }

  updateCreator(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateCreator($name: String, $bio: String, $socials: jsonb = null, $pen_name: String = "", $gender: String = "", $dob: String = "", $avatar_url: String = "", $id: Int = 10, $wallet_address: String = "") {
        insert_creators_one(object: {name: $name, bio: $bio, socials: $socials, pen_name: $pen_name, gender: $gender, dob: $dob, avatar_url: $avatar_url, id: $id, wallet_address: $wallet_address}, on_conflict: {constraint: creators_pkey, update_columns: [name, pen_name, bio, socials, gender, dob, avatar_url, wallet_address]}) {
          id
          name
          pen_name
          dob
          gender
          socials
          created_at
          bio
          avatar_url
        }
      }      
      `,
      'UpdateCreator',
      variables
    );
  }
}

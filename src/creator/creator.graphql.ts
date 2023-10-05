import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CreatorGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  addCreator(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation AddCreator($name: String, $bio: String, $socials: jsonb = null, $pen_name: String = "", $profile_picture: String = "", $gender: String = "", $dob: String = "", $avatar_url: String = "") {
      insert_creators_one(object: {name: $name, bio: $bio, socials: $socials, pen_name: $pen_name, gender: $gender, dob: $dob, avatar_url: $avatar_url}) {
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

  updateAvatar(token: string, variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      token,
      `mutation UpdateAvatar($id: Int = 10, $avatar_url: String = "") {
      update_creators_by_pk(pk_columns: {id: $id}, _set: {avatar_url: $avatar_url}) {
        id
        avatar_url
      }
    }
    `,
      'UpdateAvatar',
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
      `mutation UpdateCreator($name: String, $bio: String, $socials: jsonb = null, $pen_name: String = "", $gender: String = "", $dob: String = "", $avatar_url: String = "", $id: Int = 10) {
        insert_creators_one(object: {name: $name, bio: $bio, socials: $socials, pen_name: $pen_name, gender: $gender, dob: $dob, avatar_url: $avatar_url, id: $id}, on_conflict: {constraint: creators_pkey, update_columns: [name, pen_name, bio, socials, gender, dob, avatar_url]}) {
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

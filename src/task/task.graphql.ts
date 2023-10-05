import { ConfigService } from '@nestjs/config';
import { GraphqlService } from '../graphql/graphql.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TaskGraphql {
  constructor(
    private configSvc: ConfigService,
    private graphqlSvc: GraphqlService
  ) {}

  getPublishableChapters(variables: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `query GetPublishableChapters($pushlish_date: timestamptz!) {
        chapters(where: {status: {_eq: "Upcoming"}, _and: {status: {_eq: "Upcoming"}, pushlish_date: {_lte: $pushlish_date}}}) {
          id
          pushlish_date
          status
        }
      }`,
      'GetPublishableChapters',
      variables
    );
  }

  publishChapter(variables: any, additionHeaders: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation PublishChapter($ids: [Int!]) {
      update_chapters(where: {id: {_in: $ids}}, _set: {status: "Published"}) {
        affected_rows
        returning {
          id
          status
          pushlish_date
        }
      }
    }`,
      'PublishChapter',
      variables,
      additionHeaders
    );
  }

  increaseChaptersView(variables: any, additionHeaders: any) {
    return this.graphqlSvc.query(
      this.configSvc.get<string>('graphql.endpoint'),
      '',
      `mutation IncreaseChaptersView($updates: [chapters_updates!] = {where: {chapter_number: {_eq: 10}, manga: {_or: [{id: {_eq: 0}}, {slug: {_eq: ""}}]}}, _inc: {views: 10}}) {
        update_chapters_many(updates: $updates) {
          affected_rows
        }
      }`,
      'IncreaseChaptersView',
      variables,
      additionHeaders
    );
  }
}

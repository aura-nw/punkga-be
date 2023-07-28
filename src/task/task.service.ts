import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../redis/redis.service';
import { GraphqlService } from '../graphql/graphql.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private configService: ConfigService,
    private redisClientService: RedisService,
    private graphqlSvc: GraphqlService,
  ) {}

  // every minute, on the 1st second
  @Cron('1 * * * * *')
  async publishChapter() {
    console.log(new Date().toISOString());
    const { data } = await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `query GetPublishableChapters($pushlish_date: timestamptz!) {
        chapters(where: {status: {_eq: "Upcoming"}, _and: {status: {_eq: "Upcoming"}, pushlish_date: {_lte: $pushlish_date}}}) {
          id
          pushlish_date
          status
        }
      }`,
      'GetPublishableChapters',
      {
        pushlish_date: new Date().toISOString(),
      },
    );

    const publishableChapters = data.chapters;
    if (publishableChapters.length > 0) {
      const ids: number[] = publishableChapters.map((chapter) => chapter.id);

      const result = await this.graphqlSvc.query(
        this.configService.get<string>('graphql.endpoint'),
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
        {
          ids,
        },
        {
          'x-hasura-admin-secret': this.configService.get<string>(
            'graphql.adminSecret',
          ),
        },
      );

      this.logger.log(`Publish chapter result: ${JSON.stringify(result)}`);
    } else {
      this.logger.log(`Nothing to publish`);
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async updateChapterViews() {
    // set chapter to set
    const chapters = await this.redisClientService.client.sPop(
      [
        this.configService.get<string>('app.name'),
        this.configService.get<string>('app.env'),
        'chapters',
      ].join(':'),
      10,
    );
    if (chapters.length > 0) {
      console.log(chapters);
      const views = await Promise.all(
        chapters.map((chapterId: string) => {
          // get chapter view
          return this.redisClientService.client.getDel(
            [
              this.configService.get<string>('app.name'),
              this.configService.get<string>('app.env'),
              'chapter',
              chapterId.toString(),
              'view',
            ].join(':'),
          );
        }),
      );

      const updates = chapters
        .map((chapterId: string, index: number) => ({
          where: {
            id: {
              _eq: chapterId,
            },
          },
          _inc: {
            views: Number(views[index]),
          },
        }))
        .filter((u) => u._inc.views !== 0);

      await this.graphqlSvc.query(
        this.configService.get<string>('graphql.endpoint'),
        '',
        `mutation UpdateChapterViews($chapters: [chapters_insert_input!] = {id: 10, views: 10, manga_id: 10}, $updates: [chapters_updates!] = {where: {id: {_eq: 10}}, _set: {views: 10}}) {
        update_chapters_many(updates: $updates) {
          affected_rows
        }
      }
      `,
        'UpdateChapterViews',
        {
          updates,
        },
        {
          'x-hasura-admin-secret': this.configService.get<string>(
            'graphql.adminSecret',
          ),
        },
      );

      this.logger.debug('Update chapter views', updates);
    }
  }
}

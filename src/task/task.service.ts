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

  @Cron(CronExpression.EVERY_5_MINUTES)
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

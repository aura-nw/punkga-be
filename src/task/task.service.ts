import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { GraphqlService } from '../graphql/graphql.service';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private configService: ConfigService,
    private graphqlSvc: GraphqlService,
  ) {}

  // every minute, on the 1st second
  @Cron('1 * * * * *')
  async publishChapter() {
    const timeNow = new Date().toISOString();
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
        pushlish_date: timeNow,
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

      this.logger.debug(`Publish chapter result: ${JSON.stringify(result)}`);
    } else {
      this.logger.debug(`Nothing to publish`);
    }
  }

  // every day, on the 1st second
  @Cron('1 0 0 * * *')
  async getViewsReport() {
    const response = await this.runReport();
    const env = this.configService.get<string>('app.env');

    const regex = new RegExp(
      `https://${env}\.punkga\.me(\/[A-Za-z]+)?\/comic\/[0-9]+\/chapter\/[0-9]+`,
      'i',
    );

    const filtered = response.rows.filter((row) =>
      regex.test(row.dimensionValues[0].value),
    );

    const data = filtered.map((row) => {
      const url = row.dimensionValues[0].value;
      const arr = url
        .replace(
          new RegExp(`https://${env}\.punkga\.me(\/[A-Za-z]+)?\/comic\/`, 'i'),
          '',
        )
        .split('/');
      const mangaId = arr[0];
      const chapterNumber = arr[2];

      return {
        mangaId,
        chapterNumber,
        views: Number(row.metricValues[0].value),
      };
    });

    if (data.length === 0) {
      return;
    }

    const updates = data.map((row) => ({
      where: {
        manga_id: {
          _eq: row.mangaId,
        },
        chapter_number: {
          _eq: row.chapterNumber,
        },
      },
      _inc: {
        views: row.views,
      },
    }));

    await this.graphqlSvc.query(
      this.configService.get<string>('graphql.endpoint'),
      '',
      `mutation IncreaseChaptersView($updates: [chapters_updates!] = {where: {manga_id: {_eq: 10}, chapter_number: {_eq: 10}}, _inc: {views: 10}}) {
        update_chapters_many(updates: $updates) {
          affected_rows
        }
      }`,
      'IncreaseChaptersView',
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

  async runReport() {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      keyFilename: this.configService.get<string>('google.analytics.keyFile'),
    });
    const currentDate = new Date();
    const previousDate = new Date(
      currentDate.setDate(currentDate.getDate() - 1),
    )
      .toISOString()
      .split('T')[0];

    const propertyId = this.configService.get<string>(
      'google.analytics.propertyId',
    );

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: previousDate,
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'pageLocation',
        },
      ],
      metrics: [
        {
          name: 'screenPageViews',
        },
      ],
    });

    return response;
  }
}

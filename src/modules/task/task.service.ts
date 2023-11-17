import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { TaskGraphql } from './task.graphql';
import { detectSlugOrId } from '../../utils/utils';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private configService: ConfigService,
    private taskGraphql: TaskGraphql
  ) {}

  // every minute, on the 1st second
  @Cron('1 * * * * *')
  async publishChapter() {
    const timeNow = new Date().toISOString();
    const { data } = await this.taskGraphql.getPublishableChapters({
      pushlish_date: timeNow,
    });

    const publishableChapters = data.chapters;
    if (publishableChapters.length > 0) {
      const ids: number[] = publishableChapters.map((chapter) => chapter.id);

      const result = await this.taskGraphql.publishChapter(
        {
          ids,
        },
        {
          'x-hasura-admin-secret': this.configService.get<string>(
            'graphql.adminSecret'
          ),
        }
      );

      this.logger.debug(`Publish chapter result: ${JSON.stringify(result)}`);
    } else {
      this.logger.debug(`Nothing to publish`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async getViewsReport() {
    const response = await this.runReport();
    const env = this.configService.get<string>('app.env');

    const subdomain_pattern = ['dev', 'staging'].includes(env)
      ? `${env}\.`
      : '';

    const regex = new RegExp(
      `https://${subdomain_pattern}punkga\.me(\/[A-Za-z]+)?\/comic\/[A-Za-z0-9_]+\/chapter\/[0-9]+`,
      'i'
    );

    const filtered = response.rows.filter((row) =>
      regex.test(row.dimensionValues[0].value)
    );

    const data = filtered.map((row) => {
      const url = row.dimensionValues[0].value;
      const arr = url
        .replace(
          new RegExp(
            `https://${subdomain_pattern}punkga\.me(\/[A-Za-z0-9_]+)?\/comic\/`,
            'i'
          ),
          ''
        )
        .split('/');

      const { id: mangaId, slug: mangaSlug } = detectSlugOrId(arr[0]);
      const chapterNumber = arr[2].match(/\d+/)[0];

      return {
        mangaId,
        mangaSlug,
        chapterNumber,
        views: Number(row.metricValues[0].value),
      };
    });

    if (data.length === 0) {
      return;
    }

    const updates = data.map((row) => ({
      where: {
        manga: {
          _or: [{ id: { _eq: row.mangaId } }, { slug: { _eq: row.mangaSlug } }],
        },
        chapter_number: {
          _eq: row.chapterNumber,
        },
      },
      _inc: {
        views: row.views,
      },
    }));

    const result = await this.taskGraphql.increaseChaptersView(
      {
        updates,
      },
      {
        'x-hasura-admin-secret': this.configService.get<string>(
          'graphql.adminSecret'
        ),
      }
    );

    this.logger.debug('Update chapter views', updates);
    this.logger.debug(`Update result: ${JSON.stringify(result)}`);
  }

  async runReport() {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      keyFilename: this.configService.get<string>('google.analytics.keyFile'),
    });
    const currentDate = new Date();
    const previousDate = new Date(
      currentDate.setDate(currentDate.getDate() - 1)
    )
      .toISOString()
      .split('T')[0];

    const propertyId = this.configService.get<string>(
      'google.analytics.propertyId'
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

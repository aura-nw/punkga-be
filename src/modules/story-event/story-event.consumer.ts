import { Process } from '@nestjs/bull';
import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IJob } from './interfaces/job.interface';
import { InternalServerErrorException, Logger } from '@nestjs/common';

@Processor('story-event')
export class StoryEventConsumer {
  private logger = new Logger(StoryEventConsumer.name);

  @Process('event')
  async process(job: Job<IJob>) {
    const { type, data } = job.data;

    switch (type) {
      case 'character':
        return this.createStoryCharacterIpAsset(data);
      case 'manga':
        return this.createStoryMangaIpAsset(data);
      case 'artwork':
        return this.createStoryArtworkIpAsset(data);
      default:
        this.logger.error(
          `invalid type of event job ${JSON.stringify(job.data)}`
        );
        break;
    }
    return {};
  }

  async createStoryCharacterIpAsset(data: any) {
    // build nft metadata
    // upload metadata to ipfs
    // mint nft & create ipa
    // update offchain data
    // --- insert story ip asset
    // --- update character set story_ip_id
    // --- update submission set status = done
  }

  async createStoryMangaIpAsset(data: any) {}

  async createStoryArtworkIpAsset(data: any) {}
}

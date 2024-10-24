import { Process, Processor } from '@nestjs/bull';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bull';
import { IJob } from './interfaces/job.interface';
import { StoryProtocolService } from './story-protocol.service';

@Processor('story-protocol')
export class StoryProtocolTask implements OnModuleInit {
  private logger = new Logger(StoryProtocolTask.name);

  constructor(private storyProtocolService: StoryProtocolService) {}

  async onModuleInit() {}

  @Process({ name: 'access-protocol', concurrency: 1 })
  async process(job: Job<IJob>) {
    this.logger.debug('access-protocol job', job.data.data);
    try {
      const { data } = job.data;
      const response =
        await this.storyProtocolService.artworkMintNFTAndRegisterDerivativeNonCommercial(
          data.storyArtworkIPIds,
          data.storyCollectionId
        );
      this.logger.debug('access-protocol job response', response);
      return response;
    } catch (error) {
      this.logger.error(error);
    }
  }
}

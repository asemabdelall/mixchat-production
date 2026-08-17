import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StoriesService } from './stories.service';

@Injectable()
export class StoriesScheduler {
  private readonly logger = new Logger(StoriesScheduler.name);

  constructor(private readonly storiesService: StoriesService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleStoryExpirationCron() {
    if (process.env.NODE_ENV === 'test') return;
    try {
      this.logger.debug('Running 24h Story Expiration Cron...');
      const expiredCount = await this.storiesService.expireActiveStoriesBatch();
      if (expiredCount > 0) {
        this.logger.log(
          `24h Story Expiration Cron: Processed ${expiredCount} expired stories`,
        );
      }
    } catch (err) {
      this.logger.warn(`Story expiration cron encountered error: ${err}`);
    }
  }
}

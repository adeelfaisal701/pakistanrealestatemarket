import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyUpdatesController, NewsController } from './daily-updates.controller';
import { JobSchedulerService } from './job-scheduler.service';
import { MarketRatesService } from './market-rates.service';
import { NewsService } from './news.service';
import { MarketIndicator, MarketIndicatorSchema } from './schemas/market-indicator.schema';
import { MarketIndicatorHistory, MarketIndicatorHistorySchema } from './schemas/market-indicator-history.schema';
import { NewsArticle, NewsArticleSchema } from './schemas/news-article.schema';
import { ScheduledJobLock, ScheduledJobLockSchema } from './schemas/scheduled-job-lock.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarketIndicator.name, schema: MarketIndicatorSchema },
      { name: MarketIndicatorHistory.name, schema: MarketIndicatorHistorySchema },
      { name: NewsArticle.name, schema: NewsArticleSchema },
      { name: ScheduledJobLock.name, schema: ScheduledJobLockSchema },
    ]),
  ],
  controllers: [DailyUpdatesController, NewsController],
  providers: [MarketRatesService, NewsService, JobSchedulerService],
})
export class DailyUpdatesModule {}

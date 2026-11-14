import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { hostname } from 'os';
import { Model } from 'mongoose';
import { DailyUpdatesJob, JOB_INTERVALS, JOB_LEASE_MS } from './daily-updates.constants';
import { MarketRatesService } from './market-rates.service';
import { NewsService } from './news.service';
import { ScheduledJobLock, ScheduledJobLockDocument } from './schemas/scheduled-job-lock.schema';
import { describeError } from './utils/http';

interface JobDefinition {
  name: DailyUpdatesJob;
  intervalMs: number;
  run: () => Promise<void>;
}

const TICK_MS = 60_000;
/** A failed run is retried sooner than its normal interval, but never in a tight loop. */
const FAILURE_RETRY_MS = 15 * 60_000;

/**
 * Runs the daily-updates jobs. Disabled unless DAILY_UPDATES_JOBS_ENABLED=true.
 * Every instance ticks once a minute, but a job runs only after it has been
 * atomically claimed in MongoDB, so multiple backend instances never run the
 * same job concurrently or more than once per interval. A crashed instance's
 * lease expires after JOB_LEASE_MS.
 */
@Injectable()
export class JobSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(JobSchedulerService.name);
  private readonly owner = `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;
  private readonly running = new Set<string>();
  private readonly jobs: JobDefinition[];
  private timer: NodeJS.Timeout | null = null;
  private startupTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(ScheduledJobLock.name) private readonly lockModel: Model<ScheduledJobLockDocument>,
    private readonly config: ConfigService,
    marketRates: MarketRatesService,
    news: NewsService,
  ) {
    this.jobs = [
      // Exchange rate first: the gold job converts with the stored USD/PKR rate.
      { name: DailyUpdatesJob.EXCHANGE_RATE, intervalMs: JOB_INTERVALS[DailyUpdatesJob.EXCHANGE_RATE], run: () => marketRates.refreshExchangeRate() },
      { name: DailyUpdatesJob.GOLD, intervalMs: JOB_INTERVALS[DailyUpdatesJob.GOLD], run: () => marketRates.refreshGold() },
      { name: DailyUpdatesJob.WEATHER, intervalMs: JOB_INTERVALS[DailyUpdatesJob.WEATHER], run: () => marketRates.refreshWeather() },
      { name: DailyUpdatesJob.FUEL, intervalMs: JOB_INTERVALS[DailyUpdatesJob.FUEL], run: () => marketRates.refreshFuel() },
      { name: DailyUpdatesJob.NEWS_INGEST, intervalMs: JOB_INTERVALS[DailyUpdatesJob.NEWS_INGEST], run: () => news.ingestAll() },
    ];
  }

  get enabled(): boolean {
    return this.config.get<boolean>('dailyUpdates.jobsEnabled') === true;
  }

  onApplicationBootstrap() {
    if (!this.enabled) {
      this.logger.log('Daily updates jobs are disabled (set DAILY_UPDATES_JOBS_ENABLED=true to enable).');
      return;
    }
    this.logger.log(`Daily updates jobs enabled on ${this.owner}.`);
    this.startupTimer = setTimeout(() => void this.tick(), 10_000);
    this.startupTimer.unref();
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.startupTimer) clearTimeout(this.startupTimer);
    this.timer = null;
    this.startupTimer = null;
  }

  async tick(now = new Date()): Promise<void> {
    // Sequential: keeps outbound traffic gentle and lets the exchange rate land
    // before the metals conversion when both are due.
    for (const job of this.jobs) {
      if (this.running.has(job.name)) continue;
      await this.runIfDue(job, now).catch((error) =>
        this.logger.error(`Job ${job.name} could not be scheduled: ${describeError(error)}`),
      );
    }
  }

  /** Claims the job if it is due and unlocked. Returns false when another instance holds it. */
  async claim(name: string, now: Date): Promise<boolean> {
    try {
      const claimed = await this.lockModel
        .findOneAndUpdate(
          { _id: name, nextRunAt: { $lte: now }, lockedUntil: { $lte: now } },
          {
            $set: { owner: this.owner, lockedUntil: new Date(now.getTime() + JOB_LEASE_MS), lastStartedAt: now },
            $setOnInsert: { nextRunAt: now },
          },
          { upsert: true, new: true },
        )
        .lean()
        .exec();
      return Boolean(claimed);
    } catch (error) {
      // The document exists but is not due / is locked: the upsert's insert collides.
      if ((error as { code?: number }).code === 11000) return false;
      throw error;
    }
  }

  private async runIfDue(job: JobDefinition, now: Date) {
    if (!(await this.claim(job.name, now))) return;
    this.running.add(job.name);
    const startedAt = Date.now();
    let status: 'ok' | 'error' = 'ok';
    let lastError: string | null = null;
    try {
      await job.run();
    } catch (error) {
      status = 'error';
      lastError = describeError(error);
      this.logger.warn(`Job ${job.name} failed: ${lastError}`);
    } finally {
      this.running.delete(job.name);
      const finishedAt = new Date();
      const delay = status === 'ok' ? job.intervalMs : Math.min(job.intervalMs, FAILURE_RETRY_MS);
      await this.lockModel
        .updateOne(
          { _id: job.name, owner: this.owner },
          {
            $set: {
              lockedUntil: finishedAt,
              nextRunAt: new Date(startedAt + delay),
              lastFinishedAt: finishedAt,
              lastStatus: status,
              lastError,
            },
          },
        )
        .exec()
        .catch((error) => this.logger.error(`Job ${job.name} lock release failed: ${describeError(error)}`));
    }
  }
}

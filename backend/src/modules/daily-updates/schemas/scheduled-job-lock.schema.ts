import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ScheduledJobLockDocument = ScheduledJobLock & Document;

/**
 * One document per scheduled job. An instance may run a job only after
 * atomically claiming it (nextRunAt reached and no live lease), so several
 * backend instances never run the same job concurrently or twice per interval.
 */
@Schema({ collection: 'scheduled_job_locks' })
export class ScheduledJobLock {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ type: String, default: null })
  owner: string | null;

  @Prop({ type: Date, required: true })
  lockedUntil: Date;

  @Prop({ type: Date, required: true })
  nextRunAt: Date;

  @Prop({ type: Date, default: null })
  lastStartedAt: Date | null;

  @Prop({ type: Date, default: null })
  lastFinishedAt: Date | null;

  @Prop({ type: String, default: null })
  lastStatus: 'ok' | 'error' | null;

  @Prop({ type: String, default: null })
  lastError: string | null;
}

export const ScheduledJobLockSchema = SchemaFactory.createForClass(ScheduledJobLock);

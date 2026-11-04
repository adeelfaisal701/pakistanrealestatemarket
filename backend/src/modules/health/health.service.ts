import { InjectConnection } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Connection } from 'mongoose';

export const DATABASE_HEALTH_TIMEOUT_MS = 2_000;

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async isDatabaseReady(): Promise<boolean> {
    if (this.connection.readyState !== 1 || !this.connection.db) return false;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.connection.db
          .admin()
          .command({ ping: 1 })
          .then(() => true, () => false),
        new Promise<boolean>((resolve) => {
          timeout = setTimeout(
            () => resolve(false),
            DATABASE_HEALTH_TIMEOUT_MS,
          );
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}

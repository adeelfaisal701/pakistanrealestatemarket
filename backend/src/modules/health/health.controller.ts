import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getLegacyHealth() {
    return this.getLiveness();
  }

  @Get('live')
  getLiveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  async getReadiness() {
    const databaseReady = await this.healthService.isDatabaseReady();
    if (!databaseReady) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unavailable',
      });
    }

    return { status: 'ok', database: 'available' };
  }
}

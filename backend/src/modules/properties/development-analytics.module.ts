import {
  Controller,
  Get,
  Module,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AgentAnalyticsQueryDto } from './dto/agent-analytics-query.dto';

@Controller()
class DevelopmentAnalyticsController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      mode: 'development-sample',
      database: 'not connected (intentionally skipped)',
      scope: 'health and analytics endpoints only',
    };
  }

  @Get('health/live')
  getLiveness() {
    return { status: 'ok' };
  }

  @Get('health/ready')
  getReadiness() {
    throw new ServiceUnavailableException({
      status: 'error',
      database: 'unavailable',
    });
  }

  @Get('properties/agent/analytics')
  getAgentAnalytics(@Query() query: AgentAnalyticsQueryDto) {
    const days = query.days ?? 7;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const daily = Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() - (days - index - 1));
      return {
        date: date.toISOString().slice(0, 10),
        propertyViews: ((index * 7 + 3) % 14) + 2,
        whatsappClicks: ((index * 3 + 1) % 5) + 1,
      };
    });

    return {
      source: 'development-sample',
      days,
      daily,
      sampleMetrics: {
        adViews: days * 47 + 18,
        peopleReached: days * 31 + 12,
        callsReceived: days * 2 + 1,
      },
      propertyDetailViews: daily.reduce((total, day) => total + day.propertyViews, 0),
      whatsappClicks: daily.reduce((total, day) => total + day.whatsappClicks, 0),
      unavailable: {
        adImpressions: 'Sample data only; real ad impressions are not recorded.',
        uniqueReach: 'Sample mode does not calculate unique viewers.',
        incomingCalls: 'Sample mode does not record incoming calls.',
      },
    };
  }
}

@Module({
  controllers: [DevelopmentAnalyticsController],
})
export class DevelopmentAnalyticsModule {
  constructor() {
    if (
      process.env.NODE_ENV !== 'development' ||
      process.env.ANALYTICS_DEMO_MODE !== 'true'
    ) {
      throw new Error(
        'The in-memory analytics module can only run in explicit development demo mode.',
      );
    }
  }
}

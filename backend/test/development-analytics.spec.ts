import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { DevelopmentAnalyticsModule } from '../src/modules/properties/development-analytics.module';

test('sample analytics module is unavailable in production', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDemoMode = process.env.ANALYTICS_DEMO_MODE;

  try {
    process.env.NODE_ENV = 'production';
    process.env.ANALYTICS_DEMO_MODE = 'true';
    assert.throws(
      () => new DevelopmentAnalyticsModule(),
      /only run in explicit development demo mode/,
    );
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalDemoMode === undefined) delete process.env.ANALYTICS_DEMO_MODE;
    else process.env.ANALYTICS_DEMO_MODE = originalDemoMode;
  }
});

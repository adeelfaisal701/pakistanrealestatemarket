import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import {
  createCorsPolicy,
  createPrivateNetworkCorsMiddleware,
} from './config/cors.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // Global Validation Pipe
  // NOTE: implicit type conversion is intentionally OFF. It silently turned
  // "false" into true and "" into 0 for request bodies. DTOs that need numeric
  // query-string coercion declare it explicitly with @Type(() => Number).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global Filters & Interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  const corsPolicy = createCorsPolicy(
    configService.get<string>('nodeEnv'),
    configService.get<string>('cors.origin'),
  );
  app.use(
    createPrivateNetworkCorsMiddleware(
      configService.get<string>('nodeEnv') ?? '',
      corsPolicy.allowedOrigins,
    ),
  );
  app.enableCors(corsPolicy);

  const port = configService.get<number>('port') || 5000;
  await app.listen(port);
  logger.log(`🚀 Real Estate Backend API is running on: http://localhost:${port}/api/v1`);
}

bootstrap();

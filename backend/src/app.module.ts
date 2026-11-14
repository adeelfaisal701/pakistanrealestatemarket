import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';
import configuration from './config/configuration';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { CrmModule } from './modules/crm/crm.module';
import { AdminModule } from './modules/admin/admin.module';
import { DevelopmentAnalyticsModule } from './modules/properties/development-analytics.module';
import { BuyerModule } from './modules/buyer/buyer.module';
import { RequirementsModule } from './modules/requirements/requirements.module';
import { HealthModule } from './modules/health/health.module';
import { AgenciesModule } from './modules/agencies/agencies.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { DailyUpdatesModule } from './modules/daily-updates/daily-updates.module';

const developmentAnalyticsMode =
  process.env.NODE_ENV === 'development' &&
  process.env.ANALYTICS_DEMO_MODE === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '.env'),
      load: [configuration],
    }),
    ...(developmentAnalyticsMode
      ? [DevelopmentAnalyticsModule]
      : [
          MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: getDatabaseConfig,
            inject: [ConfigService],
          }),
          HealthModule,
          AuthModule,
          UsersModule,
          AgenciesModule,
          ProjectsModule,
          PropertiesModule,
          CrmModule,
          BuyerModule,
          RequirementsModule,
          AdminModule,
          NotificationsModule,
          MaintenanceModule,
          PromotionsModule,
          DailyUpdatesModule,
        ]),
  ],
})
export class AppModule {}

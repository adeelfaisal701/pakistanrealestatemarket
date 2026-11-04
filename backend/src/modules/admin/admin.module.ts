import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PropertiesModule } from '../properties/properties.module';
import { UsersModule } from '../users/users.module';
import { CrmModule } from '../crm/crm.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminActivity, AdminActivitySchema } from './schemas/admin-activity.schema';
import { UserReport, UserReportSchema } from './schemas/user-report.schema';
import { PublicReportsController } from './public-reports.controller';
import { AdminMutationRateLimitGuard } from './admin-mutation-rate-limit.guard';
import { SavedProperty, SavedPropertySchema } from '../buyer/schemas/saved-property.schema';
import {
  BuyerNotification,
  BuyerNotificationSchema,
} from '../buyer/schemas/buyer-notification.schema';

@Module({
  imports: [
    PropertiesModule,
    UsersModule,
    CrmModule,
    MongooseModule.forFeature([
      { name: AdminActivity.name, schema: AdminActivitySchema },
      { name: UserReport.name, schema: UserReportSchema },
      { name: SavedProperty.name, schema: SavedPropertySchema },
      { name: BuyerNotification.name, schema: BuyerNotificationSchema },
    ]),
  ],
  controllers: [AdminController, PublicReportsController],
  providers: [AdminService, AdminMutationRateLimitGuard],
  exports: [AdminService],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminMutationRateLimitGuard } from '../admin/admin-mutation-rate-limit.guard';
import {
  AdminActivity,
  AdminActivitySchema,
} from '../admin/schemas/admin-activity.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ActiveTechnicianGuard } from './active-technician.guard';
import { AdminMaintenanceController } from './admin-maintenance.controller';
import { CustomerMaintenanceController } from './customer-maintenance.controller';
import { MaintenanceImageStorageService } from './maintenance-image-storage.service';
import { MaintenanceService } from './maintenance.service';
import {
  MaintenanceRequest,
  MaintenanceRequestSchema,
} from './schemas/maintenance-request.schema';
import {
  TechnicianProfile,
  TechnicianProfileSchema,
} from './schemas/technician-profile.schema';
import { TechnicianJobsController } from './technician-jobs.controller';
import { TechnicianManagementService } from './technician-management.service';

@Module({
  imports: [
    NotificationsModule,
    MongooseModule.forFeature([
      { name: MaintenanceRequest.name, schema: MaintenanceRequestSchema },
      { name: TechnicianProfile.name, schema: TechnicianProfileSchema },
      { name: User.name, schema: UserSchema },
      { name: AdminActivity.name, schema: AdminActivitySchema },
    ]),
  ],
  controllers: [
    CustomerMaintenanceController,
    TechnicianJobsController,
    AdminMaintenanceController,
  ],
  providers: [
    MaintenanceService,
    TechnicianManagementService,
    MaintenanceImageStorageService,
    ActiveTechnicianGuard,
    AdminMutationRateLimitGuard,
  ],
})
export class MaintenanceModule {}

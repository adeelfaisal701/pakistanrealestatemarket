import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  UserNotification,
  UserNotificationSchema,
} from './schemas/user-notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserNotification.name, schema: UserNotificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  UserNotification,
  UserNotificationDocument,
} from './schemas/user-notification.schema';
import {
  User,
  UserAccountStatus,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';

export interface NotifyInput {
  type: string;
  title: string;
  message: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  /** Unique per recipient; repeated notify calls with the same key are ignored. */
  dedupeKey: string;
}

/**
 * Reusable in-app notification service. Delivery failures are logged and
 * never break the business operation that triggered them.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(UserNotification.name)
    private readonly notificationModel: Model<UserNotificationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async notifyUser(userId: string | Types.ObjectId, input: NotifyInput): Promise<void> {
    try {
      const recipient = new Types.ObjectId(String(userId));
      await this.notificationModel
        .updateOne(
          { userId: recipient, dedupeKey: input.dedupeKey.slice(0, 240) },
          {
            $setOnInsert: {
              userId: recipient,
              type: input.type,
              title: input.title.slice(0, 160),
              message: input.message.slice(0, 500),
              link: input.link,
              entityType: input.entityType,
              entityId: input.entityId,
              dedupeKey: input.dedupeKey.slice(0, 240),
              readAt: null,
              occurredAt: new Date(),
            },
          },
          { upsert: true },
        )
        .exec();
    } catch (error) {
      this.logger.warn(
        `Notification delivery failed for type ${input.type}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async notifyAdmins(input: NotifyInput): Promise<void> {
    try {
      const admins = await this.userModel
        .find({ role: UserRole.ADMIN, accountStatus: { $nin: [UserAccountStatus.SUSPENDED, UserAccountStatus.DEACTIVATED] } })
        .select('_id')
        .limit(50)
        .lean()
        .exec();
      await Promise.all(admins.map((admin) => this.notifyUser(String(admin._id), input)));
    } catch (error) {
      this.logger.warn(
        `Admin notification delivery failed for type ${input.type}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async list(userId: string, limit = 30, unreadOnly = false) {
    const boundedLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    const listFilter = unreadOnly ? { ...filter, readAt: null } : filter;
    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(listFilter)
        .sort({ occurredAt: -1, _id: -1 })
        .limit(boundedLimit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
      this.notificationModel.countDocuments({ ...filter, readAt: null }).exec(),
    ]);
    return {
      items: items.map((item) => ({
        id: String(item._id),
        type: item.type,
        title: item.title,
        message: item.message,
        link: item.link ?? null,
        entityType: item.entityType ?? null,
        entityId: item.entityId ?? null,
        readAt: item.readAt ?? null,
        createdAt: item.occurredAt,
      })),
      total,
      unreadCount,
    };
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.notificationModel
      .findOneAndUpdate(
        { _id: notificationId, userId: new Types.ObjectId(userId) },
        { $set: { readAt: new Date() } },
        { new: true },
      )
      .lean()
      .exec();
    if (!notification) throw new NotFoundException('Notification not found.');
    return { id: String(notification._id), readAt: notification.readAt };
  }

  async markAllRead(userId: string) {
    const result = await this.notificationModel
      .updateMany(
        { userId: new Types.ObjectId(userId), readAt: null },
        { $set: { readAt: new Date() } },
      )
      .exec();
    return { updated: result.modifiedCount };
  }
}

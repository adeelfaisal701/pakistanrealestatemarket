import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '../users/schemas/user.schema';
import {
  TechnicianProfile,
  TechnicianProfileDocument,
} from './schemas/technician-profile.schema';

/**
 * Runs after JwtAuthGuard + RolesGuard. Requires the caller to be a
 * technician with an active technician profile. (The JWT strategy already
 * rejects suspended/deactivated user accounts.)
 */
@Injectable()
export class ActiveTechnicianGuard implements CanActivate {
  constructor(
    @InjectModel(TechnicianProfile.name)
    private readonly profileModel: Model<TechnicianProfileDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId || request.user?.role !== UserRole.TECHNICIAN || !Types.ObjectId.isValid(userId)) {
      throw new ForbiddenException('Technician access is required.');
    }
    const profile = await this.profileModel
      .findOne({ userId: new Types.ObjectId(String(userId)) })
      .select('isActive')
      .lean()
      .exec();
    if (!profile || profile.isActive !== true) {
      throw new ForbiddenException('This technician profile is not active. Contact Ghar Safar operations.');
    }
    return true;
  }
}

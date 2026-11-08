import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AgentVerificationStatus,
  User,
  UserAccountStatus,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';

@Injectable()
export class VerifiedAgentGuard implements CanActivate {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId || request.user?.role !== UserRole.AGENT) {
      throw new ForbiddenException('Only verified agents can access client requirements.');
    }
    if (request.user.profileComplete !== true) {
      throw new ForbiddenException(
        'Complete your agent profile before accessing agent features.',
      );
    }

    const agent = await this.userModel
      .findOne({
        _id: userId,
        role: UserRole.AGENT,
      })
      .select('_id isVerified verificationStatus accountStatus')
      .lean()
      .exec();
    if (
      !agent ||
      agent.isVerified !== true ||
      (agent.verificationStatus != null &&
        agent.verificationStatus !== AgentVerificationStatus.VERIFIED) ||
      (agent.accountStatus != null &&
        agent.accountStatus !== UserAccountStatus.ACTIVE)
    ) {
      throw new ForbiddenException('Only active, verified agents can access client requirements.');
    }
    return true;
  }
}

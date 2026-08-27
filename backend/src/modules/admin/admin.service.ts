import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property, PropertyDocument, PropertyStatus } from '../properties/schemas/property.schema';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import { ModeratePropertyDto } from './dto/moderate-property.dto';
import { PropertiesService } from '../properties/properties.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private propertiesService: PropertiesService,
  ) {}

  async getPendingProperties(): Promise<PropertyDocument[]> {
    return this.propertyModel
      .find({ status: PropertyStatus.PENDING_APPROVAL })
      .populate('agentId', 'name email phone agencyName isVerified')
      .sort({ createdAt: -1 })
      .exec();
  }

  async moderateProperty(id: string, moderateDto: ModeratePropertyDto) {
    return this.propertiesService.updateStatus(id, moderateDto.status);
  }

  async verifyAgent(userId: string) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { isVerified: true },
      { new: true },
    );
  }

  async getAdminStats() {
    const [totalProperties, pendingProperties, totalAgents, totalUsers] = await Promise.all([
      this.propertyModel.countDocuments().exec(),
      this.propertyModel.countDocuments({ status: PropertyStatus.PENDING_APPROVAL }).exec(),
      this.userModel.countDocuments({ role: UserRole.AGENT }).exec(),
      this.userModel.countDocuments().exec(),
    ]);

    return {
      totalProperties,
      pendingProperties,
      totalAgents,
      totalUsers,
    };
  }
}

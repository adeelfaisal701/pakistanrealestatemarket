import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import {
  Property,
  PropertyDocument,
  PropertyStatus,
} from '../properties/schemas/property.schema';
import {
  PropertyLocationShare,
  PropertyLocationShareDocument,
} from '../properties/schemas/property-location-share.schema';
import {
  PropertyAnalyticsEvent,
  PropertyAnalyticsEventDocument,
} from '../properties/schemas/property-analytics-event.schema';
import { Lead, LeadDocument } from '../crm/schemas/lead.schema';
import {
  PropertyConversation,
  PropertyConversationDocument,
} from '../crm/schemas/property-conversation.schema';
import {
  SavedProperty,
  SavedPropertyDocument,
} from '../buyer/schemas/saved-property.schema';
import {
  BuyerNotification,
  BuyerNotificationDocument,
} from '../buyer/schemas/buyer-notification.schema';
import {
  BuyerProfile,
  BuyerProfileDocument,
} from '../buyer/schemas/buyer-profile.schema';
import { SavedSearch, SavedSearchDocument } from '../buyer/schemas/saved-search.schema';
import {
  ClientRequirement,
  ClientRequirementDocument,
} from '../requirements/schemas/client-requirement.schema';
import {
  RequirementOffer,
  RequirementOfferDocument,
} from '../requirements/schemas/requirement-offer.schema';
import {
  PropertyMessage,
  PropertyMessageDocument,
} from '../crm/schemas/property-message.schema';
import { DevelopmentProject, DevelopmentProjectDocument } from '../projects/schemas/development-project.schema';
import { Agency, AgencyDocument } from '../agencies/schemas/agency.schema';
import { PropertyImageStorageService } from '../properties/property-image-storage.service';
import {
  PropertyAdvertisement,
  PropertyAdvertisementDocument,
  PropertyAdvertisementStatus,
} from '../properties/schemas/property-advertisement.schema';
import {
  User,
  AgentVerificationStatus,
  UserAccountStatus,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';
import { ModeratePropertyDto } from './dto/moderate-property.dto';
import { AdminPropertiesQueryDto } from './dto/admin-properties-query.dto';
import { PropertiesService } from '../properties/properties.service';
import { escapeRegExp } from '../../common/utils/escape-regexp';
import { AdminAgentsQueryDto } from './dto/admin-agents-query.dto';
import { AdminAdsQueryDto } from './dto/admin-ads-query.dto';
import { AdminActivityQueryDto } from './dto/admin-activity-query.dto';
import {
  AdminAccountStatusDto,
  AdminAdvertisementActionDto,
  AdminPropertyActionDto,
} from './dto/admin-action.dto';
import { AdminDeleteDto } from './dto/admin-delete.dto';
import { AdminBuyerUpdateDto } from './dto/admin-buyer-update.dto';
import {
  CreateUserReportDto,
  UpdateUserReportDto,
} from './dto/user-report.dto';
import {
  AdminActivity,
  AdminActivityDocument,
} from './schemas/admin-activity.schema';
import {
  UserReport,
  UserReportDocument,
  UserReportStatus,
  UserReportTargetType,
} from './schemas/user-report.schema';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Optional() private readonly propertiesService?: PropertiesService,
    @Optional()
    @InjectModel(PropertyAdvertisement.name)
    private readonly advertisementModel?: Model<PropertyAdvertisementDocument>,
    @Optional()
    @InjectModel(AdminActivity.name)
    private readonly activityModel?: Model<AdminActivityDocument>,
    @Optional()
    @InjectModel(UserReport.name)
    private readonly reportModel?: Model<UserReportDocument>,
    @Optional()
    @InjectModel(Lead.name)
    private readonly leadModel?: Model<LeadDocument>,
    @Optional()
    @InjectModel(PropertyConversation.name)
    private readonly conversationModel?: Model<PropertyConversationDocument>,
    @Optional()
    @InjectModel(PropertyLocationShare.name)
    private readonly locationShareModel?: Model<PropertyLocationShareDocument>,
    @Optional()
    @InjectModel(PropertyAnalyticsEvent.name)
    private readonly analyticsModel?: Model<PropertyAnalyticsEventDocument>,
    @Optional()
    @InjectModel(SavedProperty.name)
    private readonly savedPropertyModel?: Model<SavedPropertyDocument>,
    @Optional()
    @InjectModel(BuyerNotification.name)
    private readonly buyerNotificationModel?: Model<BuyerNotificationDocument>,
    @Optional()
    @InjectConnection()
    private readonly connection?: Connection,
    @Optional()
    @InjectModel(BuyerProfile.name)
    private readonly buyerProfileModel?: Model<BuyerProfileDocument>,
    @Optional()
    @InjectModel(SavedSearch.name)
    private readonly savedSearchModel?: Model<SavedSearchDocument>,
    @Optional()
    @InjectModel(ClientRequirement.name)
    private readonly requirementModel?: Model<ClientRequirementDocument>,
    @Optional()
    @InjectModel(RequirementOffer.name)
    private readonly requirementOfferModel?: Model<RequirementOfferDocument>,
    @Optional()
    @InjectModel(PropertyMessage.name)
    private readonly messageModel?: Model<PropertyMessageDocument>,
    @Optional()
    @InjectModel(DevelopmentProject.name)
    private readonly projectModel?: Model<DevelopmentProjectDocument>,
    @Optional()
    @InjectModel(Agency.name)
    private readonly agencyModel?: Model<AgencyDocument>,
    @Optional()
    private readonly imageStorage?: PropertyImageStorageService,
  ) {}

  private async revokePropertyLocationShares(
    propertyId: Types.ObjectId,
    revokedAt: Date,
  ) {
    if (!this.locationShareModel) {
      throw new ServiceUnavailableException(
        'Location-share management is unavailable.',
      );
    }
    await this.locationShareModel.updateMany(
      { propertyId, revokedAt: null },
      { $set: { revokedAt } },
    ).exec();
  }

  private toAdminProperty(property: any) {
    const agent = property.agentId;
    return {
      id: String(property._id),
      title: property.title,
      description: property.description,
      purpose: property.purpose,
      propertyType: property.propertyType,
      price: property.price,
      areaSize: property.areaSize,
      areaUnit: property.areaUnit,
      location: {
        city: property.location?.city,
        area: property.location?.area,
      },
      features: property.features,
      images: property.images ?? [],
      status: property.status,
      inventoryStatus: property.inventoryStatus,
      adminHidden: property.adminHidden === true,
      adminRemoved: property.adminRemoved === true,
      adminFlagged: property.adminFlagged === true,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
      moderationNotes: property.moderationNotes,
      agent: agent && typeof agent === 'object'
        ? {
            id: String(agent._id),
            name: agent.name,
            phone: agent.phone,
            agencyName: agent.agencyName,
            isVerified: agent.isVerified,
          }
        : null,
    };
  }

  async getAdminProperties(query: AdminPropertiesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const filter: Record<string, unknown> = {};
    if (
      query.fromDate &&
      query.toDate &&
      new Date(query.fromDate).getTime() > new Date(query.toDate).getTime()
    ) {
      throw new BadRequestException('The start date must be on or before the end date.');
    }
    if (query.status) filter.status = query.status;
    if (query.inventoryStatus) filter.inventoryStatus = query.inventoryStatus;
    if (query.propertyType) filter.propertyType = query.propertyType;
    if (query.purpose) filter.purpose = query.purpose;
    if (query.moderationFilter === 'hidden') {
      filter.adminHidden = true;
    } else if (query.moderationFilter === 'deactivated') {
      filter.adminRemoved = true;
    } else if (query.moderationFilter === 'flagged') {
      filter.adminFlagged = true;
    } else if (query.moderationFilter === 'live') {
      filter.status = PropertyStatus.PUBLISHED;
      filter.adminHidden = { $ne: true };
      filter.adminRemoved = { $ne: true };
    }
    if (query.fromDate || query.toDate) {
      filter.createdAt = {
        ...(query.fromDate ? { $gte: new Date(query.fromDate) } : {}),
        ...(query.toDate ? { $lte: new Date(query.toDate) } : {}),
      };
    }
    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegExp(query.search.trim()), 'i');
      const searchConditions: Record<string, unknown>[] = [
        { title: regex },
        { 'location.city': regex },
        { 'location.area': regex },
      ];
      if (Types.ObjectId.isValid(query.search.trim())) {
        searchConditions.push({ _id: new Types.ObjectId(query.search.trim()) });
      }
      const matchingAgents = await this.userModel
        .find({
          role: UserRole.AGENT,
          $or: [{ name: regex }, { email: regex }, { agencyName: regex }],
        })
        .select('_id')
        .exec();
      if (matchingAgents.length) {
        searchConditions.push({
          agentId: { $in: matchingAgents.map((agent) => agent._id) },
        });
      }
      filter.$or = searchConditions;
    }
    const [properties, total, stats] = await Promise.all([
      this.propertyModel
        .find(filter)
        .select('+moderationNotes')
        .populate('agentId', 'name phone agencyName isVerified')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.propertyModel.countDocuments(filter).exec(),
      this.getPropertyStatusCounts(),
    ]);
    const advertisements = this.advertisementModel && properties.length
      ? await this.advertisementModel
          .find({ propertyId: { $in: properties.map((property) => property._id) } })
          .select('propertyId status')
          .exec()
      : [];
    const advertisementStatuses = new Map(
      advertisements.map((advertisement) => [
        String(advertisement.propertyId),
        advertisement.status,
      ]),
    );

    return {
      items: properties.map((property) => ({
        ...this.toAdminProperty(property),
        advertisementStatus: advertisementStatuses.get(String(property._id)) ?? null,
      })),
      counts: stats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPendingProperties(): Promise<Record<string, unknown>[]> {
    const properties = await this.propertyModel
      .find({ status: PropertyStatus.PENDING_APPROVAL })
      .select('+moderationNotes')
      .populate('agentId', 'name phone agencyName isVerified')
      .sort({ createdAt: -1 })
      .exec();
    return properties.map((property) => this.toAdminProperty(property));
  }

  async moderateProperty(id: string, moderateDto: ModeratePropertyDto, adminId: string) {
    const moderatedAt = new Date();
    const moderationFilter: Record<string, unknown> = {
      _id: id,
      status: PropertyStatus.PENDING_APPROVAL,
    };
    if (moderateDto.status === PropertyStatus.PUBLISHED) {
      moderationFilter.inventoryStatus = 'available';
      moderationFilter.agentArchived = { $ne: true };
      moderationFilter.adminHidden = { $ne: true };
      moderationFilter.adminRemoved = { $ne: true };
    }
    const property = await this.propertyModel
      .findOneAndUpdate(
        moderationFilter,
        {
          $set: {
            status: moderateDto.status,
            moderationNotes: moderateDto.moderationNotes ?? null,
            moderatedBy: adminId,
            moderatedAt,
          },
        },
        { new: true, runValidators: true },
      )
      .select('+moderationNotes')
      .populate('agentId', 'name phone agencyName isVerified')
      .exec();

    if (!property) {
      const exists = await this.propertyModel.exists({ _id: id }).exec();
      if (!exists) throw new NotFoundException(`Property with ID '${id}' not found`);
      throw new ConflictException('Only pending properties can be moderated');
    }

    await this.propertiesService?.syncAdvertisementModeration(
      id,
      moderateDto.status,
      moderateDto.moderationNotes ?? null,
      adminId,
      moderatedAt,
    );
    await this.logAction({
      adminId,
      actionType:
        moderateDto.status === PropertyStatus.PUBLISHED
          ? 'property.approve'
          : 'property.reject',
      entityType: 'property',
      entityId: id,
      previousStatus: PropertyStatus.PENDING_APPROVAL,
      newStatus: moderateDto.status,
      reason: moderateDto.moderationNotes,
    });
    return this.toAdminProperty(property);
  }

  async getAgents(query: Partial<AdminAgentsQueryDto> = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const baseFilter: Record<string, unknown> = { role: UserRole.AGENT };
    if (query.accountStatus && query.accountStatus !== 'all') {
      baseFilter.accountStatus = query.accountStatus;
    }
    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegExp(query.search.trim()), 'i');
      baseFilter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { agencyName: regex },
        { city: regex },
      ];
    }
    const filter: Record<string, unknown> = { ...baseFilter };
    if (query.verification === 'verified') filter.isVerified = true;
    if (query.verification === 'unverified') filter.isVerified = { $ne: true };
    if (
      query.verification === AgentVerificationStatus.PENDING ||
      query.verification === AgentVerificationStatus.REJECTED
    ) {
      filter.verificationStatus = query.verification;
    }
    const [agents, total, verifiedCount, pendingCount, rejectedCount, unverifiedCount] = await Promise.all([
      this.userModel
        .find(filter)
        .select('name email phone agencyName city avatarUrl isVerified verificationStatus verificationNotes verifiedAt accountStatus accountStatusReason accountStatusChangedAt createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
      this.userModel.countDocuments({ ...baseFilter, isVerified: true }).exec(),
      this.userModel.countDocuments({
        ...baseFilter,
        isVerified: { $ne: true },
        verificationStatus: AgentVerificationStatus.PENDING,
      }).exec(),
      this.userModel.countDocuments({
        ...baseFilter,
        isVerified: { $ne: true },
        verificationStatus: AgentVerificationStatus.REJECTED,
      }).exec(),
      this.userModel.countDocuments({ ...baseFilter, isVerified: { $ne: true } }).exec(),
    ]);

    return {
      items: agents.map((agent) => ({
        id: String(agent._id),
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        agencyName: agent.agencyName,
        city: agent.city,
        avatarUrl: agent.avatarUrl,
        isVerified: agent.isVerified,
        verificationStatus: agent.isVerified
          ? AgentVerificationStatus.VERIFIED
          : agent.verificationStatus ?? AgentVerificationStatus.UNVERIFIED,
        verificationNotes: agent.verificationNotes,
        verifiedAt: agent.verifiedAt,
        accountStatus: agent.accountStatus ?? UserAccountStatus.ACTIVE,
        accountStatusReason: agent.accountStatusReason,
        accountStatusChangedAt: agent.accountStatusChangedAt,
        createdAt: (agent as UserDocument & { createdAt?: Date }).createdAt,
      })),
      total,
      verificationCounts: {
        all: await this.userModel.countDocuments(baseFilter).exec(),
        pending_verification: pendingCount,
        verified: verifiedCount,
        unverified: unverifiedCount,
        rejected: rejectedCount,
      },
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBuyerAccounts(query: Partial<AdminAgentsQueryDto> = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const filter: Record<string, unknown> = { role: UserRole.BUYER };
    if (query.accountStatus && query.accountStatus !== 'all') {
      filter.accountStatus = query.accountStatus;
    }
    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegExp(query.search.trim()), 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { city: regex },
      ];
    }

    const [buyers, total, active, suspended, deactivated] = await Promise.all([
      this.userModel
        .find(filter)
        .select('name email phone city avatarUrl accountStatus accountStatusReason accountStatusChangedAt createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
      this.userModel.countDocuments({ role: UserRole.BUYER, accountStatus: UserAccountStatus.ACTIVE }).exec(),
      this.userModel.countDocuments({ role: UserRole.BUYER, accountStatus: UserAccountStatus.SUSPENDED }).exec(),
      this.userModel.countDocuments({ role: UserRole.BUYER, accountStatus: UserAccountStatus.DEACTIVATED }).exec(),
    ]);

    return {
      items: buyers.map((buyer) => this.toSafeBuyer(buyer)),
      total,
      counts: { active, suspended, deactivated },
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBuyerAccount(userId: string) {
    const buyer = await this.userModel
      .findOne({ _id: userId, role: UserRole.BUYER })
      .select('name email phone city avatarUrl accountStatus accountStatusReason accountStatusChangedAt createdAt')
      .lean()
      .exec();
    if (!buyer) throw new NotFoundException('Buyer not found.');
    const buyerId = new Types.ObjectId(userId);
    const [profile, savedProperties, savedSearches, notifications, requirements, leads, conversations] = await Promise.all([
      this.buyerProfileModel?.findOne({ buyerId }).lean().exec() ?? null,
      this.savedPropertyModel?.countDocuments({ buyerId }).exec() ?? 0,
      this.savedSearchModel?.countDocuments({ buyerId }).exec() ?? 0,
      this.buyerNotificationModel?.countDocuments({ buyerId }).exec() ?? 0,
      this.requirementModel?.countDocuments({ buyerId }).exec() ?? 0,
      this.leadModel?.countDocuments({ buyerId }).exec() ?? 0,
      this.conversationModel?.countDocuments({ buyerId }).exec() ?? 0,
    ]);
    return {
      ...this.toSafeBuyer(buyer),
      profile: profile?.preferences ?? null,
      relatedRecordCounts: {
        savedProperties,
        savedSearches,
        notifications,
        requirements,
        leads,
        conversations,
      },
    };
  }

  async updateBuyerAccount(
    userId: string,
    body: AdminBuyerUpdateDto,
    adminId: string,
  ) {
    const buyer = await this.userModel.findOne({ _id: userId, role: UserRole.BUYER }).exec();
    if (!buyer) throw new NotFoundException('Buyer not found.');
    if (String(buyer._id) === adminId) {
      throw new ForbiddenException('Administrators cannot edit their own account through buyer management.');
    }
    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      if (!email) throw new BadRequestException('Email cannot be empty.');
      const existing = await this.userModel
        .findOne({ email, _id: { $ne: buyer._id } })
        .select('_id')
        .lean()
        .exec();
      if (existing) throw new ConflictException('Another account already uses this email.');
      buyer.email = email;
    }
    if (body.name !== undefined) buyer.name = body.name.trim();
    if (body.phone !== undefined) buyer.phone = body.phone.trim();
    if (body.city !== undefined) buyer.city = body.city.trim();
    await buyer.save();
    await this.logAction({
      adminId,
      actionType: 'buyer.update',
      entityType: 'user',
      entityId: userId,
      metadata: { changedFields: Object.keys(body) },
    });
    return this.toSafeBuyer(buyer);
  }

  async updateBuyerAccountStatus(
    userId: string,
    body: AdminAccountStatusDto,
    adminId: string,
  ) {
    this.requireReason(body.reason, 'A reason is required for account status changes.');
    const buyer = await this.userModel.findOne({ _id: userId, role: UserRole.BUYER }).exec();
    if (!buyer) throw new NotFoundException('Buyer not found.');
    if (String(buyer._id) === adminId) {
      throw new ForbiddenException('Administrators cannot change their own status through buyer management.');
    }
    const previousStatus = buyer.accountStatus ?? UserAccountStatus.ACTIVE;
    buyer.accountStatus = body.status as UserAccountStatus;
    buyer.accountStatusReason = body.reason.trim();
    buyer.accountStatusChangedAt = new Date();
    buyer.accountStatusChangedBy = new Types.ObjectId(adminId);
    await buyer.save();
    await this.logAction({
      adminId,
      actionType: `buyer.${body.status}`,
      entityType: 'user',
      entityId: userId,
      previousStatus,
      newStatus: body.status,
      reason: body.reason,
    });
    return this.toSafeBuyer(buyer);
  }

  async deleteBuyer(userId: string, body: AdminDeleteDto, adminId: string) {
    this.validateDeleteConfirmation(body, 'DELETE BUYER');
    if (!this.connection) {
      throw new ServiceUnavailableException('Transactional buyer deletion is unavailable.');
    }
    const requiredModels = [
      this.buyerProfileModel,
      this.savedPropertyModel,
      this.savedSearchModel,
      this.buyerNotificationModel,
      this.locationShareModel,
      this.requirementModel,
      this.requirementOfferModel,
      this.leadModel,
      this.conversationModel,
      this.messageModel,
      this.activityModel,
    ];
    if (requiredModels.some((model) => !model)) {
      throw new ServiceUnavailableException('Buyer dependency cleanup is unavailable.');
    }

    const session = await this.connection.startSession();
    let deletedBuyer: UserDocument | null = null;
    let cleanupCounts = {
      buyerProfile: 0,
      savedProperties: 0,
      savedSearches: 0,
      notifications: 0,
      locationShares: 0,
      requirements: 0,
      offers: 0,
    };
    try {
      await session.withTransaction(async () => {
        const buyer = await this.userModel
          .findOne({ _id: userId })
          .session(session)
          .exec();
        if (!buyer) throw new NotFoundException('Buyer not found.');
        if (buyer.role === UserRole.ADMIN || String(buyer._id) === adminId) {
          throw new ForbiddenException('Administrator accounts cannot be deleted here.');
        }
        if (buyer.role !== UserRole.BUYER) {
          throw new BadRequestException('Only buyer accounts can be deleted through this action.');
        }
        this.requireReason(body.reason, 'A reason is required for account deletion.');
        const buyerId = buyer._id as Types.ObjectId;
        const requirements = await this.requirementModel!
          .find({ buyerId })
          .select('_id')
          .session(session)
          .lean()
          .exec();
        const requirementIds = requirements.map((requirement) => requirement._id);
        const [offers, leads, conversations, messages] = await Promise.all([
          this.requirementOfferModel!
            .countDocuments({ requirementId: { $in: requirementIds } })
            .session(session)
            .exec(),
          this.leadModel!
            .countDocuments({ buyerId })
            .session(session)
            .exec(),
          this.conversationModel!
            .countDocuments({ buyerId })
            .session(session)
            .exec(),
          this.messageModel!
            .countDocuments({ senderId: buyerId })
            .session(session)
            .exec(),
        ]);
        if (offers || leads || conversations || messages) {
          throw new ConflictException(
            `Buyer has retained business history (offers=${offers}, leads=${leads}, conversations=${conversations}, messages=${messages}); deactivate the account to preserve it.`,
          );
        }

        const [profile, savedProperties, savedSearches, notifications, locationShares] = await Promise.all([
          this.buyerProfileModel!.deleteOne({ buyerId }).session(session).exec(),
          this.savedPropertyModel!.deleteMany({ buyerId }).session(session).exec(),
          this.savedSearchModel!.deleteMany({ buyerId }).session(session).exec(),
          this.buyerNotificationModel!.deleteMany({ buyerId }).session(session).exec(),
          this.locationShareModel!.deleteMany({ recipientId: buyerId }).session(session).exec(),
        ]);
        const requirementsDeleted = await this.requirementModel!
          .deleteMany({ buyerId })
          .session(session)
          .exec();
        const userDeleted = await this.userModel
          .deleteOne({ _id: buyerId, role: UserRole.BUYER })
          .session(session)
          .exec();
        if (userDeleted.deletedCount !== 1) {
          throw new ConflictException('Buyer deletion did not remove exactly one account.');
        }
        cleanupCounts = {
          buyerProfile: profile.deletedCount ?? 0,
          savedProperties: savedProperties.deletedCount ?? 0,
          savedSearches: savedSearches.deletedCount ?? 0,
          notifications: notifications.deletedCount ?? 0,
          locationShares: locationShares.deletedCount ?? 0,
          requirements: requirementsDeleted.deletedCount ?? 0,
          offers: 0,
        };
        deletedBuyer = buyer;
        await this.logAction({
          adminId,
          actionType: 'buyer.delete',
          entityType: 'user',
          entityId: userId,
          previousStatus: buyer.accountStatus ?? UserAccountStatus.ACTIVE,
          newStatus: 'deleted',
          reason: body.reason,
          metadata: cleanupCounts,
        }, session);
      });
    } finally {
      await session.endSession();
    }

    const avatarFileRemoved = deletedBuyer?.avatarUrl
      ? await this.removeBuyerAvatarIfUnreferenced(deletedBuyer.avatarUrl, userId)
      : false;
    return { deleted: true, id: userId, cleanupCounts, avatarFileRemoved };
  }

  private toSafeBuyer(buyer: UserDocument | Record<string, any>) {
    return {
      id: String(buyer._id),
      name: buyer.name,
      email: buyer.email,
      phone: buyer.phone,
      city: buyer.city,
      avatarUrl: buyer.avatarUrl,
      role: UserRole.BUYER,
      accountStatus: buyer.accountStatus ?? UserAccountStatus.ACTIVE,
      accountStatusReason: buyer.accountStatusReason,
      accountStatusChangedAt: buyer.accountStatusChangedAt,
      createdAt: (buyer as UserDocument & { createdAt?: Date }).createdAt,
    };
  }

  private async removeBuyerAvatarIfUnreferenced(url: string, userId: string) {
    const filename = this.imageStorage?.filenameForManagedUrl(url);
    if (!filename || !this.projectModel || !this.agencyModel) return false;
    const [userReference, propertyReference, agencyReference, projectReference] = await Promise.all([
      this.userModel.findOne({ _id: { $ne: new Types.ObjectId(userId) }, avatarUrl: url }).select('_id').exec(),
      this.propertyModel.findOne({ $or: [{ images: url }, { 'imageMetadata.url': url }] }).select('_id').exec(),
      this.agencyModel.findOne({ $or: [{ logoUrl: url }, { coverImageUrl: url }, { galleryUrls: url }] }).select('_id').exec(),
      this.projectModel.findOne({ $or: [{ coverImage: url }, { gallery: url }, { 'paymentPlan.documentUrl': url }] }).select('_id').exec(),
    ]);
    if (userReference || propertyReference || agencyReference || projectReference) return false;
    try {
      await this.imageStorage.remove(filename);
      return true;
    } catch {
      this.logger.warn('Buyer avatar cleanup failed; a managed file may need later review.');
      return false;
    }
  }

  async getAgentProfile(userId: string) {
    const agent = await this.userModel
      .findOne({ _id: userId, role: UserRole.AGENT })
      .select('name email phone agencyName city avatarUrl isVerified verificationStatus verificationNotes verifiedAt accountStatus accountStatusReason accountStatusChangedAt createdAt')
      .exec();
    if (!agent) throw new NotFoundException('Agent not found');
    const [properties, advertisements] = await Promise.all([
      this.propertyModel
        .find({ agentId: agent._id })
        .sort({ createdAt: -1 })
        .exec(),
      this.advertisementModel
        ? this.advertisementModel
            .find({ agentId: agent._id })
            .populate('propertyId', 'title location price purpose propertyType status')
            .sort({ createdAt: -1 })
            .exec()
        : Promise.resolve([]),
    ]);
    return {
      agent: {
        id: String(agent._id),
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        agencyName: agent.agencyName,
        city: agent.city,
        avatarUrl: agent.avatarUrl,
        isVerified: agent.isVerified,
        verificationStatus: agent.isVerified
          ? AgentVerificationStatus.VERIFIED
          : agent.verificationStatus ?? AgentVerificationStatus.UNVERIFIED,
        verifiedAt: agent.verifiedAt,
        accountStatus: agent.accountStatus ?? UserAccountStatus.ACTIVE,
        accountStatusReason: agent.accountStatusReason,
        createdAt: (agent as UserDocument & { createdAt?: Date }).createdAt,
      },
      properties: properties.map((property) => this.toAdminProperty(property)),
      advertisements: advertisements.map((advertisement) => ({
        id: String(advertisement._id),
        status: advertisement.status,
        submittedAt: advertisement.submittedAt,
        approvedAt: advertisement.approvedAt,
        property: advertisement.propertyId,
      })),
    };
  }

  async getAdminAgencies(query: AdminAgentsQueryDto) {
    const agents = await this.userModel
      .find({ role: UserRole.AGENT })
      .select('name email phone agencyName city isVerified accountStatus createdAt')
      .sort({ agencyName: 1, createdAt: -1 })
      .exec();
    const groups = new Map<string, {
      name: string;
      agents: Array<Record<string, unknown>>;
    }>();
    for (const agent of agents) {
      const name = agent.agencyName?.trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase();
      const group = groups.get(key) ?? { name, agents: [] };
      group.agents.push({
        id: String(agent._id),
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        city: agent.city,
        isVerified: agent.isVerified,
        accountStatus: agent.accountStatus ?? UserAccountStatus.ACTIVE,
      });
      groups.set(key, group);
    }
    const regex = query.search?.trim()
      ? new RegExp(escapeRegExp(query.search.trim()), 'i')
      : undefined;
    const filtered = [...groups.values()]
      .filter((agency) =>
        !regex ||
        regex.test(agency.name) ||
        agency.agents.some((agent) =>
          [agent.name, agent.email, agent.city].some(
            (value) => typeof value === 'string' && regex.test(value),
          ),
        ),
      )
      .sort((left, right) => left.name.localeCompare(right.name));
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    return {
      items: filtered.slice((page - 1) * limit, page * limit).map((agency) => ({
        name: agency.name,
        agents: agency.agents,
        agentCount: agency.agents.length,
        verifiedAgentCount: agency.agents.filter((agent) => agent.isVerified).length,
        suspendedAgentCount: agency.agents.filter(
          (agent) => agent.accountStatus === UserAccountStatus.SUSPENDED,
        ).length,
      })),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  async verifyAgent(userId: string, adminId: string, reason?: string) {
    const user = await this.findAgent(userId);
    const previousStatus = user.isVerified ? 'verified' : 'unverified';
    user.isVerified = true;
    user.verificationStatus = AgentVerificationStatus.VERIFIED;
    user.verificationNotes = undefined;
    const now = new Date();
    user.verificationChangedAt = now;
    user.verificationChangedBy = new Types.ObjectId(adminId);
    user.verifiedAt = now;
    user.verifiedBy = new Types.ObjectId(adminId) as never;
    await user.save();
    await this.logAction({
      adminId,
      actionType: 'agent.verify',
      entityType: 'agent',
      entityId: userId,
      previousStatus,
      newStatus: 'verified',
      reason,
    });
    return this.toSafeAgent(user);
  }

  async unverifyAgent(userId: string, reason: string | undefined, adminId: string) {
    this.requireReason(reason, 'A reason is required to remove agent verification.');
    const user = await this.findAgent(userId);
    const previousStatus = user.isVerified ? 'verified' : 'unverified';
    user.isVerified = false;
    user.verificationStatus = AgentVerificationStatus.UNVERIFIED;
    user.verificationNotes = reason?.trim();
    user.verificationChangedAt = new Date();
    user.verificationChangedBy = new Types.ObjectId(adminId);
    user.verifiedAt = undefined;
    user.verifiedBy = undefined;
    await user.save();
    await this.logAction({
      adminId,
      actionType: 'agent.unverify',
      entityType: 'agent',
      entityId: userId,
      previousStatus,
      newStatus: 'unverified',
      reason,
    });
    return this.toSafeAgent(user);
  }

  async rejectAgentVerification(
    userId: string,
    reason: string | undefined,
    adminId: string,
  ) {
    this.requireReason(reason, 'A reason is required to reject verification.');
    const user = await this.findAgent(userId);
    const previousStatus = user.isVerified ? 'verified' : user.verificationStatus;
    user.isVerified = false;
    user.verificationStatus = AgentVerificationStatus.REJECTED;
    user.verificationNotes = reason?.trim();
    user.verificationChangedAt = new Date();
    user.verificationChangedBy = new Types.ObjectId(adminId);
    user.verifiedAt = undefined;
    user.verifiedBy = undefined;
    await user.save();
    await this.logAction({
      adminId,
      actionType: 'agent.verification_rejected',
      entityType: 'agent',
      entityId: userId,
      previousStatus,
      newStatus: AgentVerificationStatus.REJECTED,
      reason,
    });
    return this.toSafeAgent(user);
  }

  async updateAgentAccountStatus(
    userId: string,
    body: AdminAccountStatusDto,
    adminId: string,
  ) {
    this.requireReason(body.reason, 'A reason is required for account status changes.');
    const user = await this.findAgent(userId);
    const previousStatus = user.accountStatus ?? UserAccountStatus.ACTIVE;
    user.accountStatus = body.status as UserAccountStatus;
    user.accountStatusReason = body.reason?.trim();
    user.accountStatusChangedAt = new Date();
    user.accountStatusChangedBy = new Types.ObjectId(adminId) as never;
    await user.save();
    let pausedAdvertisements = 0;
    if (
      body.status !== UserAccountStatus.ACTIVE &&
      this.advertisementModel
    ) {
      const paused = await this.advertisementModel.updateMany(
        {
          agentId: user._id,
          status: PropertyAdvertisementStatus.PUBLISHED,
        },
        {
          $set: {
            status: PropertyAdvertisementStatus.PAUSED,
            pausedAt: user.accountStatusChangedAt,
            moderationNotes: body.reason?.trim(),
            moderatedBy: new Types.ObjectId(adminId),
          },
        },
      ).exec();
      pausedAdvertisements = paused.modifiedCount ?? 0;
    }
    await this.logAction({
      adminId,
      actionType: `agent.${body.status}`,
      entityType: 'agent',
      entityId: userId,
      previousStatus,
      newStatus: body.status,
      reason: body.reason,
      metadata: { pausedAdvertisements },
    });
    return this.toSafeAgent(user);
  }

  async deleteAgent(userId: string, body: AdminDeleteDto, adminId: string) {
    this.validateDeleteConfirmation(body, 'DELETE AGENT');
    const user = await this.findAgent(userId);
    const leadModel = this.requireRetentionModel(this.leadModel, 'lead');
    const conversationModel = this.requireRetentionModel(
      this.conversationModel,
      'conversation',
    );
    const advertisementModel = this.requireAdvertisementModel();
    const [properties, leads, conversations, advertisements] = await Promise.all([
      this.propertyModel.countDocuments({ agentId: user._id }).exec(),
      leadModel.countDocuments({ agentId: user._id }).exec(),
      conversationModel.countDocuments({ agentId: user._id }).exec(),
      advertisementModel.countDocuments({ agentId: user._id }).exec(),
    ]);
    if (properties || leads || conversations || advertisements) {
      throw new ConflictException(
        'This agent has linked property, advertisement, lead, or conversation records. Deactivate the account instead to preserve its history.',
      );
    }
    await this.userModel.deleteOne({ _id: user._id, role: UserRole.AGENT }).exec();
    await this.logAction({
      adminId,
      actionType: 'agent.delete',
      entityType: 'agent',
      entityId: userId,
      previousStatus: user.accountStatus ?? UserAccountStatus.ACTIVE,
      newStatus: 'deleted',
      reason: body.reason,
    });
    return { deleted: true, id: userId };
  }

  async adminPropertyAction(
    propertyId: string,
    body: AdminPropertyActionDto,
    adminId: string,
  ) {
    const reasonRequired = ['reject', 'hide', 'flag', 'remove'].includes(body.action);
    if (reasonRequired) {
      this.requireReason(body.reason, `A reason is required to ${body.action} a property.`);
    }

    const property = await this.propertyModel
      .findById(propertyId)
      .select('+moderationNotes +adminModerationReason')
      .exec();
    if (!property) throw new NotFoundException('Property not found');
    const previousStatus = property.status;
    const now = new Date();

    if (['unpublish', 'hide', 'remove'].includes(body.action)) {
      await this.revokePropertyLocationShares(property._id, now);
    }

    if (body.action === 'approve' || body.action === 'reject') {
      if (property.status !== PropertyStatus.PENDING_APPROVAL) {
        throw new ConflictException('Only pending properties can be approved or rejected.');
      }
      const nextStatus =
        body.action === 'approve' ? PropertyStatus.PUBLISHED : PropertyStatus.REJECTED;
      const result = await this.moderateProperty(
        propertyId,
        {
          status: nextStatus,
          ...(body.reason ? { moderationNotes: body.reason } : {}),
        },
        adminId,
      );
      return result;
    }

    if (body.action === 'unpublish') {
      const advertisement = await this.requireAdvertisement(propertyId);
      if (advertisement.status !== PropertyAdvertisementStatus.PUBLISHED) {
        throw new ConflictException('Only a published advertisement can be unpublished.');
      }
      await this.advertisementModel!.updateOne(
        { _id: advertisement._id },
        { $set: { status: PropertyAdvertisementStatus.PAUSED, pausedAt: now } },
      ).exec();
    }

    if (body.action === 'restore' && property.adminRemoved) {
      throw new ConflictException('Removed properties cannot be restored.');
    }
    const set: Record<string, unknown> = {};
    if (body.action === 'hide') {
      set.adminHidden = true;
      set.adminModerationReason = body.reason?.trim();
    } else if (body.action === 'restore') {
      if (!property.adminHidden) throw new ConflictException('Property is not hidden.');
      set.adminHidden = false;
      set.adminModerationReason = null;
    } else if (body.action === 'flag') {
      set.adminFlagged = true;
      set.adminModerationReason = body.reason?.trim();
    } else if (body.action === 'remove') {
      set.adminRemoved = true;
      set.adminModerationReason = body.reason?.trim();
      if (this.advertisementModel) {
        await this.advertisementModel.updateOne(
          { propertyId: property._id },
          {
            $set: {
              status: PropertyAdvertisementStatus.ENDED,
              endedAt: now,
              moderationNotes: body.reason?.trim(),
            },
          },
        ).exec();
      }
    } else if (body.action === 'reactivate') {
      if (!property.adminRemoved) {
        throw new ConflictException('Only a deactivated (removed) property can be reactivated.');
      }
      set.adminRemoved = false;
      set.adminModerationReason = null;
      // Restore the advertisement to paused so the agent can re-publish
      if (this.advertisementModel) {
        await this.advertisementModel.updateOne(
          {
            propertyId: property._id,
            status: PropertyAdvertisementStatus.ENDED,
          },
          {
            $set: {
              status: PropertyAdvertisementStatus.PAUSED,
              pausedAt: now,
              moderationNotes: null,
            },
          },
        ).exec();
      }
    }

    const updated = await this.propertyModel
      .findByIdAndUpdate(
        propertyId,
        { $set: set },
        { new: true, runValidators: true },
      )
      .select('+adminModerationReason')
      .populate('agentId', 'name phone agencyName isVerified')
      .exec();
    if (!updated) throw new NotFoundException('Property not found');
    await this.logAction({
      adminId,
      actionType: `property.${body.action}`,
      entityType: 'property',
      entityId: propertyId,
      previousStatus,
      newStatus: updated.status,
      reason: body.reason,
      metadata: {
        hidden: updated.adminHidden === true,
        removed: updated.adminRemoved === true,
        flagged: updated.adminFlagged === true,
      },
    });
    return this.toAdminProperty(updated);
  }

  async deleteProperty(
    propertyId: string,
    body: AdminDeleteDto,
    adminId: string,
  ) {
    this.validateDeleteConfirmation(body, 'DELETE PROPERTY');
    const leadModel = this.requireRetentionModel(this.leadModel, 'lead');
    const conversationModel = this.requireRetentionModel(
      this.conversationModel,
      'conversation',
    );
    const shareModel = this.requireRetentionModel(
      this.locationShareModel,
      'location-share',
    );
    const advertisementModel = this.requireAdvertisementModel();
    const savedPropertyModel = this.requireRetentionModel(
      this.savedPropertyModel,
      'saved-property',
    );
    const notificationModel = this.requireRetentionModel(
      this.buyerNotificationModel,
      'buyer-notification',
    );
    const activityModel = this.requireActivityModel();
    if (!this.connection) {
      throw new ServiceUnavailableException(
        'Transactional hard deletion is unavailable.',
      );
    }
    const session = await this.connection.startSession();
    let deleted = false;
    try {
      await session.withTransaction(async () => {
        const property = await this.propertyModel
          .findById(propertyId)
          .session(session)
          .exec();
        if (!property) throw new NotFoundException('Property not found');
        this.requireReason(body.reason, 'A reason is required for hard deletion.');
        if (!property.agentArchived && !property.adminRemoved) {
          throw new ConflictException(
            'Hard deletion is only available for properties already archived or removed. Use Archive or Hide for normal removal.',
          );
        }

        const advertisements = await advertisementModel
          .find({ propertyId: property._id })
          .session(session)
          .exec();
        if (advertisements.length > 1) {
          throw new ConflictException(
            'Multiple advertisements reference this property. Resolve the duplicate records before hard deletion.',
          );
        }
        const advertisement = advertisements[0];
        const advertisementIds = advertisements.map((item) => item._id);
        const leadFilter: Record<string, unknown> = {
          $or: [
            { propertyId: property._id },
            ...(advertisementIds.length
              ? [{ advertisementId: { $in: advertisementIds } }]
              : []),
          ],
        };
        const conversationFilter: Record<string, unknown> = {
          $or: [
            { propertyId: property._id },
            ...(advertisementIds.length
              ? [{ advertisementId: { $in: advertisementIds } }]
              : []),
          ],
        };
        const leads = await leadModel
          .countDocuments(leadFilter)
          .session(session)
          .exec();
        const conversations = await conversationModel
          .countDocuments(conversationFilter)
          .session(session)
          .exec();
        if (leads || conversations) {
          throw new ConflictException(
            'This property has linked lead or conversation history. Use Remove to hide it while retaining its records.',
          );
        }

        const now = new Date();
        await savedPropertyModel
          .deleteMany({ propertyId: property._id })
          .session(session)
          .exec();
        await notificationModel
          .updateMany(
            { propertyId: property._id },
            { $set: { propertyId: null } },
          )
          .session(session)
          .exec();
        await shareModel
          .deleteMany({ propertyId: property._id })
          .session(session)
          .exec();
        if (advertisement) {
          await advertisementModel
            .deleteOne({ _id: advertisement._id })
            .session(session)
            .exec();
        }
        const propertyDeletion = await this.propertyModel
          .deleteOne({ _id: property._id })
          .session(session)
          .exec();
        if (propertyDeletion.deletedCount !== 1) {
          throw new ConflictException(
            'Property deletion did not remove exactly one record.',
          );
        }

        await activityModel.create(
          [{
            adminId: new Types.ObjectId(adminId),
            actionType: 'property.delete',
            entityType: 'property',
            entityId: propertyId,
            previousStatus: property.status,
            newStatus: 'deleted',
            reason: body.reason?.trim(),
            metadata: {
              advertisementId: advertisement ? String(advertisement._id) : undefined,
              imagesRetained: property.images?.length ?? 0,
              analyticsRetained: true,
              reportsRetained: true,
              locationSharesDeleted: true,
              savedPropertiesRemoved: true,
              notificationsUnlinked: true,
            },
            occurredAt: now,
          }],
          { session },
        );
        deleted = true;
      });
    } finally {
      await session.endSession();
    }
    if (!deleted) {
      throw new ConflictException(
        'The hard-delete transaction completed without confirming deletion.',
      );
    }
    return { deleted, id: propertyId };
  }

  async getAdminAdvertisements(query: AdminAdsQueryDto) {
    const model = this.requireAdvertisementModel();
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegExp(query.search.trim()), 'i');
      const properties = await this.propertyModel
        .find({
          $or: [
            { title: regex },
            { 'location.city': regex },
            { 'location.area': regex },
          ],
        })
        .select('_id')
        .exec();
      const agents = await this.userModel
        .find({
          role: UserRole.AGENT,
          $or: [{ name: regex }, { email: regex }, { agencyName: regex }],
        })
        .select('_id')
        .exec();
      const targets: Record<string, unknown>[] = [
        { propertyId: { $in: properties.map((item) => item._id) } },
        { agentId: { $in: agents.map((item) => item._id) } },
      ];
      if (Types.ObjectId.isValid(query.search.trim())) {
        targets.push({ _id: new Types.ObjectId(query.search.trim()) });
      }
      filter.$or = targets;
    }
    const [advertisements, total] = await Promise.all([
      model
        .find(filter)
        .populate('propertyId', 'title description purpose propertyType price areaSize areaUnit location images status inventoryStatus')
        .populate('agentId', 'name email phone agencyName city isVerified accountStatus')
        .sort({ submittedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      model.countDocuments(filter).exec(),
    ]);
    const analyticsByAd = new Map<string, Record<string, number>>();
    if (this.analyticsModel && advertisements.length) {
      const analytics = await this.analyticsModel
      .aggregate<{
        _id: { advertisementId: Types.ObjectId; type: string };
        count: number;
      }>([
        {
          $match: {
            advertisementId: {
              $in: advertisements.map((ad) => ad._id),
            },
          },
        },
        {
          $group: {
            _id: { advertisementId: '$advertisementId', type: '$type' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();
      for (const item of analytics) {
      const key = String(item._id.advertisementId);
      const counts = analyticsByAd.get(key) ?? {};
      counts[item._id.type] = item.count;
      analyticsByAd.set(key, counts);
      }
    }
    return {
      items: advertisements.map((ad) => ({
        id: String(ad._id),
        status: ad.status,
        submittedAt: ad.submittedAt,
        approvedAt: ad.approvedAt,
        publishedAt: ad.publishedAt,
        pausedAt: ad.pausedAt,
        endedAt: ad.endedAt,
        moderationNotes: ad.moderationNotes,
        property: ad.propertyId,
        agent: ad.agentId,
        analytics: analyticsByAd.get(String(ad._id)) ?? {
          property_view: 0,
          call_click: 0,
          whatsapp_click: 0,
        },
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async adminAdvertisementAction(
    advertisementId: string,
    body: AdminAdvertisementActionDto,
    adminId: string,
  ) {
    if (['reject', 'remove'].includes(body.action)) {
      this.requireReason(body.reason, `A reason is required to ${body.action} an advertisement.`);
    }
    const model = this.requireAdvertisementModel();
    const ad = await model.findById(advertisementId).exec();
    if (!ad) throw new NotFoundException('Advertisement not found');
    const previousStatus = ad.status;
    const now = new Date();
    let property: PropertyDocument | null = null;
    if (['approve', 'publish', 'resume'].includes(body.action)) {
      property = await this.propertyModel
        .findById(ad.propertyId)
        .select('_id agentId inventoryStatus agentArchived adminHidden adminRemoved')
        .exec();
      if (!property) {
        throw new BadRequestException('The associated property no longer exists.');
      }
      if (
        property.agentArchived ||
        property.adminHidden ||
        property.adminRemoved ||
        property.inventoryStatus !== 'available' ||
        String(property.agentId) !== String(ad.agentId)
      ) {
        throw new BadRequestException(
          'The property must be active, available, and owned by the advertisement agent before publishing.',
        );
      }
    }
    let status: PropertyAdvertisementStatus;
    switch (body.action) {
      case 'approve':
        if (ad.status !== PropertyAdvertisementStatus.PENDING_REVIEW) {
          throw new ConflictException('Only pending advertisements can be approved.');
        }
        status = PropertyAdvertisementStatus.PUBLISHED;
        ad.approvedAt = now;
        ad.publishedAt = now;
        break;
      case 'reject':
        if (ad.status !== PropertyAdvertisementStatus.PENDING_REVIEW) {
          throw new ConflictException('Only pending advertisements can be rejected.');
        }
        status = PropertyAdvertisementStatus.REJECTED;
        ad.approvedAt = undefined;
        ad.publishedAt = undefined;
        break;
      case 'publish':
      case 'resume':
        if (
          !ad.approvedAt ||
          ![
            PropertyAdvertisementStatus.PUBLISHED,
            PropertyAdvertisementStatus.PAUSED,
            PropertyAdvertisementStatus.ENDED,
          ].includes(ad.status)
        ) {
          throw new BadRequestException('An advertisement must be approved before publishing.');
        }
        status = PropertyAdvertisementStatus.PUBLISHED;
        ad.publishedAt = now;
        break;
      case 'unpublish':
      case 'pause':
        if (ad.status !== PropertyAdvertisementStatus.PUBLISHED) {
          throw new ConflictException('Only a published advertisement can be paused.');
        }
        status = PropertyAdvertisementStatus.PAUSED;
        ad.pausedAt = now;
        break;
      case 'end':
        status = PropertyAdvertisementStatus.ENDED;
        ad.endedAt = now;
        break;
      case 'remove':
        status = PropertyAdvertisementStatus.REMOVED;
        ad.endedAt = now;
        break;
    }
    ad.status = status;
    ad.moderationNotes = body.reason?.trim() || ad.moderationNotes;
    ad.moderatedBy = new Types.ObjectId(adminId);
    if (status !== PropertyAdvertisementStatus.PUBLISHED) {
      await this.revokePropertyLocationShares(ad.propertyId, now);
    }
    if (status === PropertyAdvertisementStatus.PUBLISHED) {
      const publication = await this.propertyModel.updateOne(
        {
          _id: ad.propertyId,
          agentId: ad.agentId,
          inventoryStatus: 'available',
          agentArchived: { $ne: true },
          adminHidden: { $ne: true },
          adminRemoved: { $ne: true },
        },
        {
          $set: {
            status: PropertyStatus.PUBLISHED,
            moderatedBy: new Types.ObjectId(adminId),
            moderatedAt: now,
            moderationNotes: body.reason?.trim() ?? null,
          },
        },
      ).exec();
      if (
        publication.matchedCount === 0 ||
        (publication.matchedCount === undefined && publication.modifiedCount === 0)
      ) {
        throw new BadRequestException(
          'The property is no longer eligible for advertisement publishing.',
        );
      }
    }
    await ad.save();
    if (status === PropertyAdvertisementStatus.REJECTED) {
      await this.propertyModel.updateOne(
        { _id: ad.propertyId },
        {
          $set: {
            status: PropertyStatus.REJECTED,
            moderatedBy: new Types.ObjectId(adminId),
            moderatedAt: now,
            moderationNotes: body.reason?.trim() ?? null,
          },
        },
      ).exec();
    }
    await this.logAction({
      adminId,
      actionType: `advertisement.${body.action}`,
      entityType: 'advertisement',
      entityId: advertisementId,
      previousStatus,
      newStatus: status,
      reason: body.reason,
      metadata: { propertyId: String(ad.propertyId), agentId: String(ad.agentId) },
    });
    return {
      id: String(ad._id),
      propertyId: String(ad.propertyId),
      agentId: String(ad.agentId),
      status: ad.status,
      submittedAt: ad.submittedAt,
      approvedAt: ad.approvedAt,
      publishedAt: ad.publishedAt,
      moderationNotes: ad.moderationNotes,
    };
  }

  async createUserReport(body: CreateUserReportDto, ipAddress: string) {
    if (!this.reportModel) {
      throw new ServiceUnavailableException('Reports are temporarily unavailable.');
    }
    if (!Types.ObjectId.isValid(body.targetId)) {
      throw new BadRequestException('The report target ID is invalid.');
    }
    const targetExists = await this.reportTargetExists(body.targetType, body.targetId);
    if (!targetExists) throw new NotFoundException('The reported item was not found.');
    const sourceHash = this.hashReportSource(ipAddress || 'unknown');
    const recentFromAddress = await this.reportModel
      .findOne({
        sourceHash,
        createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
      })
      .select('_id')
      .exec();
    if (recentFromAddress) {
      throw new ConflictException('Please wait before submitting another report.');
    }
    const reporterIdentity = body.reporterEmail?.trim().toLowerCase() ||
      body.reporterPhone?.replace(/\D/g, '');
    const recentDuplicate = reporterIdentity
      ? await this.reportModel
          .findOne({
            targetType: body.targetType,
            targetId: body.targetId,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            $or: [
              ...(body.reporterEmail
                ? [{ reporterEmail: body.reporterEmail.trim().toLowerCase() }]
                : []),
              ...(body.reporterPhone
                ? [{ reporterPhone: body.reporterPhone.trim() }]
                : []),
            ],
          })
          .select('_id')
          .exec()
      : null;
    if (recentDuplicate) {
      throw new ConflictException('A report for this item was recently submitted.');
    }
    const report = await this.reportModel.create({
      ...body,
      details: body.details.trim(),
      sourceHash,
    });
    return { id: String(report._id), status: report.status };
  }

  async getUserReports(query: AdminActivityQueryDto) {
    const model = this.requireReportModel();
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const filter: Record<string, unknown> = {};
    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegExp(query.search.trim()), 'i');
      filter.$or = [
        { targetId: regex },
        { category: regex },
        { details: regex },
        { status: regex },
      ];
    }
    const [reports, total] = await Promise.all([
      model
        .find(filter)
        .select('+internalNotes')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      model.countDocuments(filter).exec(),
    ]);
    return {
      items: reports.map((report) => ({
        id: String(report._id),
        targetType: report.targetType,
        targetId: report.targetId,
        category: report.category,
        details: report.details,
        reporterName: report.reporterName,
        reporterEmail: report.reporterEmail,
        reporterPhone: report.reporterPhone,
        status: report.status,
        internalNotes: report.internalNotes,
        resolutionDetails: report.resolutionDetails,
        reviewedBy: report.reviewedBy,
        reviewedAt: report.reviewedAt,
        createdAt: (report as UserReportDocument & { createdAt?: Date }).createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateUserReport(
    reportId: string,
    body: UpdateUserReportDto,
    adminId: string,
  ) {
    if (
      [UserReportStatus.RESOLVED, UserReportStatus.REJECTED].includes(body.status) &&
      !body.resolutionDetails?.trim()
    ) {
      throw new BadRequestException('Resolution details are required to close a report.');
    }
    const model = this.requireReportModel();
    const report = await model.findById(reportId).exec();
    if (!report) throw new NotFoundException('Report not found');
    const previousStatus = report.status;
    report.status = body.status;
    report.internalNotes = body.internalNotes?.trim();
    report.resolutionDetails = body.resolutionDetails?.trim();
    report.reviewedBy = new Types.ObjectId(adminId);
    report.reviewedAt = new Date();
    await report.save();
    await this.logAction({
      adminId,
      actionType: 'report.update',
      entityType: 'report',
      entityId: reportId,
      previousStatus,
      newStatus: report.status,
      reason: report.resolutionDetails,
      metadata: {
        targetType: report.targetType,
        targetId: report.targetId,
      },
    });
    return {
      id: String(report._id),
      status: report.status,
      resolutionDetails: report.resolutionDetails,
      reviewedAt: report.reviewedAt,
    };
  }

  async getActivityLog(query: AdminActivityQueryDto) {
    const model = this.requireActivityModel();
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const filter: Record<string, unknown> = {};
    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegExp(query.search.trim()), 'i');
      filter.$or = [
        { actionType: regex },
        { entityType: regex },
        { entityId: regex },
        { reason: regex },
      ];
    }
    const [items, total] = await Promise.all([
      model
        .find(filter)
        .populate('adminId', 'name email')
        .sort({ occurredAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      model.countDocuments(filter).exec(),
    ]);
    return {
      items: items.map((item) => ({
        id: String(item._id),
        admin: item.adminId,
        actionType: item.actionType,
        entityType: item.entityType,
        entityId: item.entityId,
        previousStatus: item.previousStatus,
        newStatus: item.newStatus,
        reason: item.reason,
        metadata: item.metadata,
        occurredAt: item.occurredAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAdminStats() {
    const [
      propertyStatusCounts,
      totalAgents,
      verifiedAgents,
      totalUsers,
      suspendedAgents,
      pendingAdvertisements,
      publishedAdvertisements,
      openReports,
      totalReports,
    ] = await Promise.all([
      this.getPropertyStatusCounts(),
      this.userModel.countDocuments({ role: UserRole.AGENT }).exec(),
      this.userModel.countDocuments({ role: UserRole.AGENT, isVerified: true }).exec(),
      this.userModel.countDocuments().exec(),
      this.userModel
        .countDocuments({
          role: UserRole.AGENT,
          accountStatus: UserAccountStatus.SUSPENDED,
        })
        .exec(),
      this.advertisementModel
        ? this.advertisementModel
            .countDocuments({ status: PropertyAdvertisementStatus.PENDING_REVIEW })
            .exec()
        : Promise.resolve(0),
      this.advertisementModel
        ? this.advertisementModel
            .countDocuments({ status: PropertyAdvertisementStatus.PUBLISHED })
            .exec()
        : Promise.resolve(0),
      this.reportModel
        ? this.reportModel
            .countDocuments({
              status: { $in: [UserReportStatus.OPEN, UserReportStatus.UNDER_REVIEW] },
            })
            .exec()
        : Promise.resolve(0),
      this.reportModel
        ? this.reportModel.countDocuments({}).exec()
        : Promise.resolve(0),
    ]);
    const totalProperties = propertyStatusCounts.total;
    const pendingAgents = totalAgents - verifiedAgents;

    return {
      totalProperties,
      pendingProperties: propertyStatusCounts.pending_approval,
      publishedProperties: propertyStatusCounts.published,
      rejectedProperties: propertyStatusCounts.rejected,
      draftProperties: propertyStatusCounts.draft,
      soldProperties: propertyStatusCounts.sold,
      otherProperties: totalProperties -
        propertyStatusCounts.pending_approval -
        propertyStatusCounts.published -
        propertyStatusCounts.rejected -
        propertyStatusCounts.draft -
        propertyStatusCounts.sold,
      propertyStatusCounts,
      totalAgents,
      verifiedAgents,
      pendingAgents,
      totalUsers,
      suspendedAgents,
      pendingAdvertisements,
      publishedAdvertisements,
      openReports,
      totalReports,
    };
  }

  private async getPropertyStatusCounts(): Promise<Record<string, number>> {
    const groups = await this.propertyModel
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .exec();
    const counts: Record<string, number> = {
      draft: 0,
      pending_approval: 0,
      published: 0,
      rejected: 0,
      sold: 0,
    };
    for (const { _id, count } of groups) {
      counts[_id] = count;
    }
    counts.total = groups.reduce((total, group) => total + group.count, 0);
    // Additional moderation-state counts (independent of property status)
    const [hiddenCount, deactivatedCount] = await Promise.all([
      this.propertyModel.countDocuments({ adminHidden: true }).exec(),
      this.propertyModel.countDocuments({ adminRemoved: true }).exec(),
    ]);
    counts.hidden = hiddenCount;
    counts.deactivated = deactivatedCount;
    return counts;
  }

  private async findAgent(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user || user.role !== UserRole.AGENT) {
      throw new NotFoundException('Agent not found');
    }
    return user;
  }

  private toSafeAgent(user: UserDocument) {
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      agencyName: user.agencyName,
      city: user.city,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
      verifiedAt: user.verifiedAt,
      accountStatus: user.accountStatus ?? UserAccountStatus.ACTIVE,
      accountStatusReason: user.accountStatusReason,
      accountStatusChangedAt: user.accountStatusChangedAt,
      verificationStatus: user.isVerified
        ? AgentVerificationStatus.VERIFIED
        : user.verificationStatus ?? AgentVerificationStatus.UNVERIFIED,
    };
  }

  private requireReason(reason: string | undefined, message: string): void {
    if (!reason?.trim()) throw new BadRequestException(message);
  }

  private async logAction(input: {
    adminId: string;
    actionType: string;
    entityType: string;
    entityId: string;
    previousStatus?: string;
    newStatus?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }, session?: ClientSession): Promise<void> {
    if (!this.activityModel) return;
    await this.activityModel.create({
      ...input,
      adminId: new Types.ObjectId(input.adminId),
      reason: input.reason?.trim(),
      occurredAt: new Date(),
    }, session ? { session } : undefined);
  }

  private requireAdvertisementModel(): Model<PropertyAdvertisementDocument> {
    if (!this.advertisementModel) {
      throw new ServiceUnavailableException('Advertisement moderation is unavailable.');
    }
    return this.advertisementModel;
  }

  private requireReportModel(): Model<UserReportDocument> {
    if (!this.reportModel) {
      throw new ServiceUnavailableException('Reports are temporarily unavailable.');
    }
    return this.reportModel;
  }

  private requireActivityModel(): Model<AdminActivityDocument> {
    if (!this.activityModel) {
      throw new ServiceUnavailableException('Admin activity logging is unavailable.');
    }
    return this.activityModel;
  }

  private async requireAdvertisement(propertyId: string) {
    const advertisement = await this.requireAdvertisementModel()
      .findOne({ propertyId })
      .exec();
    if (!advertisement) throw new NotFoundException('Advertisement not found');
    return advertisement;
  }

  private async reportTargetExists(
    targetType: UserReportTargetType,
    targetId: string,
  ): Promise<boolean> {
    if (targetType === UserReportTargetType.PROPERTY) {
      return Boolean(await this.propertyModel.exists({ _id: targetId }).exec());
    }
    if (targetType === UserReportTargetType.ADVERTISEMENT) {
      return Boolean(
        await this.requireAdvertisementModel().exists({ _id: targetId }).exec(),
      );
    }
    return Boolean(
      await this.userModel
        .exists({ _id: targetId, role: UserRole.AGENT })
        .exec(),
    );
  }

  private hashReportSource(ipAddress: string): string {
    return createHash('sha256').update(ipAddress).digest('hex');
  }

  private validateDeleteConfirmation(body: AdminDeleteDto, expected: string) {
    this.requireReason(body.reason, 'A reason is required for permanent deletion.');
    if (body.confirmation !== expected) {
      throw new BadRequestException(`Type "${expected}" to confirm permanent deletion.`);
    }
  }

  private requireRetentionModel<T>(
    model: Model<T> | undefined,
    entityName: string,
  ): Model<T> {
    if (!model) {
      throw new ServiceUnavailableException(
        `Cannot verify linked ${entityName} history for safe deletion.`,
      );
    }
    return model;
  }
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import {
  BuyerNotification,
  BuyerNotificationType,
} from '../buyer/schemas/buyer-notification.schema';
import {
  AdminActivity,
} from '../admin/schemas/admin-activity.schema';
import {
  Property,
  PropertyStatus,
} from '../properties/schemas/property.schema';
import {
  PropertyAdvertisement,
  PropertyAdvertisementStatus,
} from '../properties/schemas/property-advertisement.schema';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import { PropertyMessagingService } from '../crm/property-messaging.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { CreateRequirementOfferDto } from './dto/create-requirement-offer.dto';
import { AdminRequirementsQueryDto } from './dto/admin-requirements-query.dto';
import { ModerateRequirementDto } from './dto/moderate-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import {
  ClientRequirement,
  ClientRequirementStatus,
} from './schemas/client-requirement.schema';
import {
  RequirementOffer,
  RequirementOfferStatus,
} from './schemas/requirement-offer.schema';

const publicPropertyFields =
  'title description price purpose propertyType areaSize areaUnit location.area location.city images inventoryStatus features.bedrooms features.bathrooms';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}

function redactClientContacts(value: string) {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[contact details hidden]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[contact details hidden]');
}

function referenceId(value: unknown): string {
  return value && typeof value === 'object' && '_id' in value
    ? String(value._id)
    : String(value);
}

const agentPrivateRequirementFields = new Set([
  'buyerId',
  'acceptedOfferId',
  'offeredAgentIds',
  'statusBeforeModeration',
  'moderatedBy',
  'moderatedAt',
  'moderationReason',
]);

function toAgentRequirement(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  const publicFields = Object.fromEntries(
    Object.entries(value).filter(([key]) => !agentPrivateRequirementFields.has(key)),
  );
  if (typeof publicFields.title === 'string') {
    publicFields.title = redactClientContacts(publicFields.title);
  }
  if (typeof publicFields.description === 'string') {
    publicFields.description = redactClientContacts(publicFields.description);
  }
  return publicFields;
}

@Injectable()
export class RequirementsService {
  constructor(
    @InjectModel(ClientRequirement.name)
    private readonly requirementModel: Model<ClientRequirement>,
    @InjectModel(RequirementOffer.name)
    private readonly offerModel: Model<RequirementOffer>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Property.name)
    private readonly propertyModel: Model<Property>,
    @InjectModel(PropertyAdvertisement.name)
    private readonly advertisementModel: Model<PropertyAdvertisement>,
    @InjectModel(BuyerNotification.name)
    private readonly notificationModel: Model<BuyerNotification>,
    @InjectModel(AdminActivity.name)
    private readonly activityModel: Model<AdminActivity>,
    private readonly messagingService: PropertyMessagingService,
  ) {}

  async getBuyerRequirements(buyerId: string) {
    const requirements = await this.requirementModel
      .find({ buyerId: new Types.ObjectId(buyerId) })
      .sort({ createdAt: -1, _id: -1 })
      .lean()
      .exec();
    if (!requirements.length) return [];

    const offers = await this.getOffersForBuyer(
      requirements.map((requirement) => String(requirement._id)),
    );
    const offersByRequirement = new Map<string, typeof offers>();
    for (const offer of offers) {
      const current = offersByRequirement.get(offer.requirementId) ?? [];
      current.push(offer);
      offersByRequirement.set(offer.requirementId, current);
    }

    return requirements.map((item) => ({
      ...item,
      id: String(item._id),
      offers: offersByRequirement.get(String(item._id)) ?? [],
      offerCount: offersByRequirement.get(String(item._id))?.length ?? 0,
    }));
  }

  async createRequirement(buyerId: string, dto: CreateRequirementDto) {
    this.validateRanges(dto);
    this.validateLaunchLocation(dto.location);
    const requirement = await this.requirementModel.create({
      ...dto,
      buyerId: new Types.ObjectId(buyerId),
      status: ClientRequirementStatus.DRAFT,
    });
    return this.toBuyerRequirement(requirement);
  }

  async getBuyerRequirement(buyerId: string, requirementId: string) {
    const requirement = await this.requirementModel
      .findOne({
        _id: requirementId,
        buyerId: new Types.ObjectId(buyerId),
      })
      .exec();
    if (!requirement) throw new NotFoundException('Requirement not found.');
    const offers = await this.getOffersForBuyer(requirementId);
    return { ...this.toBuyerRequirement(requirement), offers };
  }

  async updateRequirement(
    buyerId: string,
    requirementId: string,
    dto: UpdateRequirementDto,
  ) {
    const requirement = await this.getOwnedRequirement(buyerId, requirementId);
    if (requirement.status !== ClientRequirementStatus.DRAFT) {
      throw new ConflictException('Only draft requirements can be edited.');
    }
    const changes = { ...dto };
    const unset: Record<string, 1> = {};
    for (const field of [
      'minBudget',
      'maxBudget',
      'minArea',
      'maxArea',
      'bedrooms',
      'bathrooms',
      'areaUnit',
    ] as const) {
      if (changes[field] === null) {
        delete changes[field];
        unset[field] = 1;
      }
    }
    const updatedValues = { ...requirement.toObject(), ...changes };
    this.validateRanges(updatedValues);
    this.validateLaunchLocation(updatedValues.location);
    const update: Record<string, unknown> = {};
    if (Object.keys(changes).length) update.$set = changes;
    if (Object.keys(unset).length) update.$unset = unset;
    const updated = await this.requirementModel.findOneAndUpdate(
      {
        _id: requirementId,
        buyerId: new Types.ObjectId(buyerId),
        status: ClientRequirementStatus.DRAFT,
      },
      update,
      { new: true, runValidators: true },
    ).exec();
    if (!updated) throw new ConflictException('Only draft requirements can be edited.');
    return this.toBuyerRequirement(updated);
  }

  async setBuyerRequirementStatus(
    buyerId: string,
    requirementId: string,
    action: 'publish' | 'pause' | 'close',
  ) {
    const requirement = await this.getOwnedRequirement(buyerId, requirementId);
    const allowedFrom = {
      publish: [
        ClientRequirementStatus.DRAFT,
        ClientRequirementStatus.PAUSED,
      ],
      pause: [ClientRequirementStatus.PUBLISHED],
      close: [
        ClientRequirementStatus.DRAFT,
        ClientRequirementStatus.PUBLISHED,
        ClientRequirementStatus.PAUSED,
      ],
    } as const;
    if (!(allowedFrom[action] as readonly string[]).includes(requirement.status)) {
      throw new ConflictException(`A ${requirement.status} requirement cannot transition to ${action}.`);
    }
    if (action === 'publish') {
      this.validateRanges(requirement.toObject());
      this.validateLaunchLocation(requirement.location);
    }
    const nextStatus =
      action === 'publish'
        ? ClientRequirementStatus.PUBLISHED
        : action === 'pause'
          ? ClientRequirementStatus.PAUSED
          : ClientRequirementStatus.CLOSED;
    const updated = await this.requirementModel.findOneAndUpdate(
      {
        _id: requirementId,
        buyerId: new Types.ObjectId(buyerId),
        status: { $in: allowedFrom[action] },
      },
      { $set: { status: nextStatus } },
      { new: true },
    ).exec();
    if (!updated) throw new ConflictException('The requirement changed before this action could be applied.');
    if (action === 'close') await this.rejectPendingOffers(requirementId);
    return this.toBuyerRequirement(updated);
  }

  async deleteDraftRequirement(buyerId: string, requirementId: string) {
    const requirement = await this.getOwnedRequirement(buyerId, requirementId);
    if (requirement.status !== ClientRequirementStatus.DRAFT) {
      throw new ConflictException('Only draft requirements can be deleted.');
    }
    const offerCount = await this.offerModel.countDocuments({ requirementId }).exec();
    if (offerCount > 0) {
      throw new ConflictException('A requirement with offers cannot be deleted.');
    }
    const result = await this.requirementModel.deleteOne({
      _id: requirementId,
      buyerId: new Types.ObjectId(buyerId),
      status: ClientRequirementStatus.DRAFT,
    }).exec();
    if (result.deletedCount !== 1) {
      throw new ConflictException('Only draft requirements can be deleted.');
    }
    return { id: requirementId, deleted: true };
  }

  async getPublishedRequirements(agentId: string) {
    const requirements = await this.requirementModel
      .find({ status: ClientRequirementStatus.PUBLISHED })
      .select('-buyerId -acceptedOfferId -moderatedBy -moderatedAt -moderationReason')
      .sort({ createdAt: -1, _id: -1 })
      .limit(100)
      .lean()
      .exec();
    const existing = await this.offerModel
      .find({
        agentId: new Types.ObjectId(agentId),
        requirementId: { $in: requirements.map((item) => item._id) },
      })
      .select('requirementId')
      .lean()
      .exec();
    const offeredIds = new Set(existing.map((offer) => String(offer.requirementId)));
    const counts = await this.offerModel.aggregate([
      { $match: { requirementId: { $in: requirements.map((item) => item._id) } } },
      { $group: { _id: '$requirementId', count: { $sum: 1 } } },
    ]);
    const countByRequirement = new Map(
      counts.map((item) => [String(item._id), item.count as number]),
    );
    return requirements.map((item) => ({
      ...(toAgentRequirement(item) ?? {}),
      id: String(item._id),
      offerCount: countByRequirement.get(String(item._id)) ?? 0,
      hasSubmittedOffer: offeredIds.has(String(item._id)),
    }));
  }

  async getEligibleProperties(agentId: string) {
    const ads = await this.advertisementModel
      .find({
        agentId: new Types.ObjectId(agentId),
        status: PropertyAdvertisementStatus.PUBLISHED,
      })
      .select('propertyId')
      .lean()
      .exec();
    if (ads.length === 0) return [];
    const properties = await this.propertyModel
      .find({
        _id: { $in: ads.map((ad) => ad.propertyId) },
        agentId: new Types.ObjectId(agentId),
        status: PropertyStatus.PUBLISHED,
        inventoryStatus: 'available',
        adminHidden: { $ne: true },
        adminRemoved: { $ne: true },
        agentArchived: { $ne: true },
      })
      .select(publicPropertyFields)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return properties.map((property) => ({
      id: String(property._id),
      title: property.title,
      price: property.price,
      purpose: property.purpose,
      propertyType: property.propertyType,
      areaSize: property.areaSize,
      areaUnit: property.areaUnit,
      location: property.location,
      images: property.images,
      bedrooms: property.features?.bedrooms,
      bathrooms: property.features?.bathrooms,
    }));
  }

  async createOffer(
    agentId: string,
    requirementId: string,
    dto: CreateRequirementOfferDto,
  ) {
    const requirement = await this.requirementModel.findOne({
      _id: requirementId,
      status: ClientRequirementStatus.PUBLISHED,
    }).exec();
    if (!requirement) throw new NotFoundException('Published requirement not found.');
    await this.findEligibleProperty(agentId, dto.propertyId);
    const duplicate = await this.offerModel.findOne({
      requirementId,
      agentId,
    }).select('_id').lean().exec();
    if (duplicate) {
      throw new ConflictException('You have already submitted an offer for this requirement.');
    }

    const reservedRequirement = await this.requirementModel.findOneAndUpdate(
      {
        _id: requirementId,
        status: ClientRequirementStatus.PUBLISHED,
        offeredAgentIds: { $ne: new Types.ObjectId(agentId) },
      },
      { $addToSet: { offeredAgentIds: new Types.ObjectId(agentId) } },
      { new: true },
    ).select('+buyerId').exec();
    if (!reservedRequirement) {
      throw new ConflictException(
        'The requirement is no longer available or you already submitted an offer.',
      );
    }

    let offer: HydratedDocument<RequirementOffer>;
    try {
      offer = await this.offerModel.create({
        requirementId: new Types.ObjectId(requirementId),
        agentId: new Types.ObjectId(agentId),
        propertyId: new Types.ObjectId(dto.propertyId),
        message: dto.message?.trim() ?? '',
        status: RequirementOfferStatus.PENDING,
      });
    } catch (error) {
      await this.requirementModel.updateOne(
        { _id: requirementId },
        { $pull: { offeredAgentIds: new Types.ObjectId(agentId) } },
      ).exec();
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('You have already submitted an offer for this requirement.');
      }
      throw error;
    }

    if (!reservedRequirement.buyerId) {
      throw new NotFoundException('Requirement owner not found.');
    }
    try {
      await this.notificationModel.updateOne(
        {
          buyerId: reservedRequirement.buyerId,
          dedupeKey: `requirement-offer:${String(offer._id)}`,
        },
        {
          $setOnInsert: {
            buyerId: reservedRequirement.buyerId,
            type: BuyerNotificationType.REQUIREMENT_OFFER,
            title: 'New property offer',
            message: `An agent sent a property offer for “${requirement.title}”.`,
            requirementId: new Types.ObjectId(requirementId),
            offerId: offer._id,
            dedupeKey: `requirement-offer:${String(offer._id)}`,
            occurredAt: new Date(),
          },
        },
        { upsert: true },
      ).exec();
    } catch (error) {
      await this.offerModel.deleteOne({ _id: offer._id }).exec();
      await this.requirementModel.updateOne(
        { _id: requirementId },
        { $pull: { offeredAgentIds: new Types.ObjectId(agentId) } },
      ).exec();
      throw error;
    }

    return {
      id: String(offer._id),
      requirementId,
      propertyId: dto.propertyId,
      status: offer.status,
      createdAt: offer.createdAt,
    };
  }

  async getAgentOffers(agentId: string) {
    const offers = await this.offerModel
      .find({ agentId: new Types.ObjectId(agentId) })
      .populate({
        path: 'requirementId',
        select: 'title purpose propertyType location minBudget maxBudget minArea maxArea areaUnit status',
      })
      .populate({ path: 'propertyId', select: publicPropertyFields })
      .sort({ createdAt: -1, _id: -1 })
      .lean()
      .exec();
    return offers.map((offer) => ({
      id: String(offer._id),
      status: offer.status,
      message: offer.message,
      createdAt: offer.createdAt,
      respondedAt: offer.respondedAt,
      conversationId: offer.conversationId ? String(offer.conversationId) : null,
      requirement: toAgentRequirement(offer.requirementId),
      property: this.withPropertyId(offer.propertyId),
    }));
  }

  async getAdminRequirements(query: AdminRequirementsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const filter: Record<string, unknown> = {};
    if (query.status && query.status !== 'all') filter.status = query.status;
    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegExp(query.search.trim()), 'i');
      const users = await this.userModel
        .find({ role: UserRole.BUYER, $or: [{ name: regex }, { email: regex }, { phone: regex }] })
        .select('_id')
        .lean()
        .exec();
      const buyerIds = users.map((user) => user._id);
      filter.$or = [
        { title: regex },
        { description: regex },
        { 'location.city': regex },
        { 'location.area': regex },
        { buyerId: { $in: buyerIds } },
      ];
    }
    const [requirements, total] = await Promise.all([
      this.requirementModel
        .find(filter)
        .select('+buyerId')
        .populate({ path: 'buyerId', select: 'name email phone' })
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.requirementModel.countDocuments(filter).exec(),
    ]);
    const counts = await this.offerModel.aggregate([
      { $match: { requirementId: { $in: requirements.map((item) => item._id) } } },
      { $group: { _id: '$requirementId', count: { $sum: 1 } } },
    ]);
    const countByRequirement = new Map(
      counts.map((item) => [String(item._id), item.count as number]),
    );
    return {
      items: requirements.map((item) => ({
        ...item,
        id: String(item._id),
        buyer: item.buyerId,
        buyerId: undefined,
        offerCount: countByRequirement.get(String(item._id)) ?? 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAdminRequirement(requirementId: string) {
    const requirement = await this.requirementModel
      .findById(requirementId)
      .select('+buyerId')
      .populate({ path: 'buyerId', select: 'name email phone' })
      .lean()
      .exec();
    if (!requirement) throw new NotFoundException('Requirement not found.');
    const history = await this.activityModel
      .find({ entityType: 'client_requirement', entityId: requirementId })
      .populate({ path: 'adminId', select: 'name' })
      .sort({ occurredAt: -1, _id: -1 })
      .limit(50)
      .lean()
      .exec();
    const offers = await this.offerModel
      .find({ requirementId })
      .populate({ path: 'agentId', select: 'name email phone agencyName verificationStatus' })
      .populate({ path: 'propertyId', select: publicPropertyFields })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
    return {
      ...requirement,
      id: String(requirement._id),
      buyer: requirement.buyerId,
      buyerId: undefined,
      offers: offers.map((offer) => ({
        id: String(offer._id),
        status: offer.status,
        message: offer.message,
        createdAt: offer.createdAt,
        agent: offer.agentId,
        property: this.withPropertyId(offer.propertyId),
      })),
      moderationHistory: history.map((entry) => ({
        action: entry.actionType,
        admin: entry.adminId,
        previousStatus: entry.previousStatus,
        newStatus: entry.newStatus,
        reason: entry.reason,
        occurredAt: entry.occurredAt,
      })),
    };
  }

  async moderateRequirement(
    requirementId: string,
    dto: ModerateRequirementDto,
    adminId: string,
  ) {
    const requirement = await this.requirementModel.findById(requirementId).exec();
    if (!requirement) throw new NotFoundException('Requirement not found.');
    const previousStatus = requirement.status;
    let nextStatus: ClientRequirementStatus;
    let moderationReason: string | null;
    if (dto.action === 'suspend') {
      if (previousStatus === ClientRequirementStatus.CLOSED || previousStatus === ClientRequirementStatus.SUSPENDED) {
        throw new ConflictException(`A ${previousStatus} requirement cannot be suspended.`);
      }
      nextStatus = ClientRequirementStatus.SUSPENDED;
      moderationReason = dto.reason?.trim() || null;
    } else if (dto.action === 'restore') {
      if (previousStatus !== ClientRequirementStatus.SUSPENDED) {
        throw new ConflictException('Only suspended requirements can be restored.');
      }
      nextStatus =
        requirement.statusBeforeModeration ?? ClientRequirementStatus.PAUSED;
      moderationReason = null;
    } else {
      if (previousStatus === ClientRequirementStatus.CLOSED) {
        throw new ConflictException('This requirement is already closed.');
      }
      nextStatus = ClientRequirementStatus.CLOSED;
      moderationReason = dto.reason?.trim() || requirement.moderationReason || null;
    }
    const set: Record<string, unknown> = {
      status: nextStatus,
      moderatedBy: new Types.ObjectId(adminId),
      moderatedAt: new Date(),
      moderationReason,
    };
    const unset: Record<string, 1> = {};
    if (dto.action === 'suspend') {
      set.statusBeforeModeration = previousStatus;
    } else if (dto.action === 'restore') {
      unset.statusBeforeModeration = 1;
    }
    const updated = await this.requirementModel.findOneAndUpdate(
      { _id: requirementId, status: previousStatus },
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { new: true },
    ).exec();
    if (!updated) throw new ConflictException('The requirement changed before moderation could be applied.');
    if (dto.action === 'close') await this.rejectPendingOffers(requirementId);
    await this.activityModel.create({
      adminId: new Types.ObjectId(adminId),
      actionType: `requirement_${dto.action}`,
      entityType: 'client_requirement',
      entityId: requirementId,
      previousStatus,
      newStatus: updated.status,
      reason: dto.reason?.trim(),
    });
    return this.toBuyerRequirement(updated);
  }

  async respondToOffer(
    buyerId: string,
    requirementId: string,
    offerId: string,
    response: 'accepted' | 'rejected',
  ) {
    const requirement = await this.getOwnedRequirement(buyerId, requirementId);
    if (requirement.status !== ClientRequirementStatus.PUBLISHED) {
      throw new ConflictException('Offers can only be reviewed while the requirement is published.');
    }
    const offerToRespond = await this.offerModel.findOne({
      _id: new Types.ObjectId(offerId),
      requirementId: new Types.ObjectId(requirementId),
    })
      .populate({ path: 'agentId', select: 'name agencyName avatarUrl verificationStatus isVerified' })
      .populate({ path: 'propertyId', select: publicPropertyFields })
      .exec();
    if (!offerToRespond) {
      throw new NotFoundException('Offer not found for this requirement.');
    }
    if (offerToRespond.status !== RequirementOfferStatus.PENDING) {
      throw new ConflictException('This offer has already been reviewed.');
    }

    if (response === 'accepted') {
      await this.findEligibleProperty(
        referenceId(offerToRespond.agentId),
        referenceId(offerToRespond.propertyId),
      );
      const buyer = await this.userModel
        .findById(buyerId)
        .select('name email phone')
        .exec();
      if (!buyer) throw new NotFoundException('Requirement owner not found.');

      const accepted = await this.offerModel.findOneAndUpdate(
        { _id: offerToRespond._id, requirementId: new Types.ObjectId(requirementId), status: RequirementOfferStatus.PENDING },
        { $set: { status: RequirementOfferStatus.ACCEPTED, respondedAt: new Date() } },
        { new: true },
      )
        .populate({ path: 'agentId', select: 'name agencyName avatarUrl verificationStatus isVerified' })
        .populate({ path: 'propertyId', select: publicPropertyFields })
        .exec();
      if (!accepted) throw new ConflictException('This offer has already been reviewed.');

      let conversationId: string;
      try {
        const conversation = await this.messagingService.startBuyerConversation(
          referenceId(offerToRespond.propertyId),
          buyerId,
          {
            visitorName: buyer.name,
            visitorEmail: buyer.email,
            visitorPhone: buyer.phone,
          },
        );
        conversationId = String(conversation.id);
        if (offerToRespond.message?.trim()) {
          await this.messagingService.sendAgentMessage(
            conversationId,
            { id: referenceId(offerToRespond.agentId), role: UserRole.AGENT },
            {
              content: offerToRespond.message,
              idempotencyKey: `requirement-offer:${offerId}`,
            },
          );
        }
        const linkedOffer = await this.offerModel.updateOne(
          { _id: offerToRespond._id, requirementId: new Types.ObjectId(requirementId), status: RequirementOfferStatus.ACCEPTED },
          { $set: { conversationId: new Types.ObjectId(conversationId) } },
        ).exec();
        if (linkedOffer.matchedCount === 0) {
          throw new ConflictException('The accepted offer could not be linked to its conversation.');
        }
      } catch (error) {
        await this.offerModel.updateOne(
          { _id: offerToRespond._id, requirementId: new Types.ObjectId(requirementId), status: RequirementOfferStatus.ACCEPTED },
          { $set: { status: RequirementOfferStatus.PENDING, respondedAt: null, conversationId: null } },
        ).exec();
        throw error;
      }

      accepted.conversationId = new Types.ObjectId(conversationId);
      return this.toBuyerOffer(accepted);
    }

    const rejected = await this.offerModel.findOneAndUpdate(
      {
        _id: offerToRespond._id,
        requirementId: new Types.ObjectId(requirementId),
        status: RequirementOfferStatus.PENDING,
      },
      { $set: { status: RequirementOfferStatus.REJECTED, respondedAt: new Date() } },
      { new: true },
    )
      .populate({ path: 'agentId', select: 'name agencyName avatarUrl verificationStatus isVerified' })
      .populate({ path: 'propertyId', select: publicPropertyFields })
      .exec();
    if (!rejected) throw new ConflictException('This offer has already been reviewed.');
    return this.toBuyerOffer(rejected);
  }

  private async getOwnedRequirement(buyerId: string, requirementId: string) {
    const requirement = await this.requirementModel.findOne({
      _id: requirementId,
      buyerId: new Types.ObjectId(buyerId),
    }).exec();
    if (!requirement) throw new NotFoundException('Requirement not found.');
    return requirement;
  }

  private async rejectPendingOffers(
    requirementId: string,
    excludingOfferId?: string,
  ) {
    const filter: Record<string, unknown> = {
      requirementId,
      status: RequirementOfferStatus.PENDING,
    };
    if (excludingOfferId) {
      filter._id = { $ne: new Types.ObjectId(excludingOfferId) };
    }
    await this.offerModel.updateMany(
      filter,
      { $set: { status: RequirementOfferStatus.REJECTED, respondedAt: new Date() } },
    ).exec();
  }

  private async findEligibleProperty(agentId: string, propertyId: string) {
    const advertisement = await this.advertisementModel.findOne({
      propertyId: new Types.ObjectId(propertyId),
      agentId: new Types.ObjectId(agentId),
      status: PropertyAdvertisementStatus.PUBLISHED,
    }).select('_id').lean().exec();
    if (!advertisement) {
      throw new ForbiddenException('Offers can only use your published listings.');
    }
    const property = await this.propertyModel.findOne({
      _id: propertyId,
      agentId: new Types.ObjectId(agentId),
      status: PropertyStatus.PUBLISHED,
      inventoryStatus: 'available',
      adminHidden: { $ne: true },
      adminRemoved: { $ne: true },
      agentArchived: { $ne: true },
    }).select(publicPropertyFields).lean().exec();
    if (!property) throw new NotFoundException('Eligible property listing not found.');
    return property;
  }

  private async getOffersForBuyer(requirementIds: string | string[]) {
    const ids = Array.isArray(requirementIds) ? requirementIds : [requirementIds];
    const offers = await this.offerModel
      .find({
        requirementId: {
          $in: ids.map((requirementId) => new Types.ObjectId(requirementId)),
        },
      })
      .populate({
        path: 'agentId',
        select: 'name agencyName avatarUrl verificationStatus isVerified',
      })
      .populate({ path: 'propertyId', select: publicPropertyFields })
      .sort({ createdAt: -1, _id: -1 })
      .lean()
      .exec();
    return offers.map((offer) => this.toBuyerOffer(offer));
  }

  private toBuyerOffer(offer: {
    _id: Types.ObjectId;
    requirementId: Types.ObjectId;
    message: string;
    status: RequirementOfferStatus;
    createdAt: Date;
    respondedAt?: Date | null;
    conversationId?: Types.ObjectId | null;
    agentId: unknown;
    propertyId: unknown;
  }) {
    return {
      id: String(offer._id),
      requirementId: String(offer.requirementId),
      message: offer.message,
      status: offer.status,
      createdAt: offer.createdAt,
      respondedAt: offer.respondedAt,
      conversationId: offer.conversationId ? String(offer.conversationId) : null,
      agent: offer.agentId,
      property: this.withPropertyId(offer.propertyId),
    };
  }

  private withPropertyId(value: unknown) {
    if (!value || typeof value !== 'object' || !('_id' in value)) return value;
    return { ...value, id: String(value._id) };
  }

  private validateRanges(value: {
    minBudget?: number | null;
    maxBudget?: number | null;
    minArea?: number | null;
    maxArea?: number | null;
  }) {
    const minBudget = value.minBudget ?? undefined;
    const maxBudget = value.maxBudget ?? undefined;
    const minArea = value.minArea ?? undefined;
    const maxArea = value.maxArea ?? undefined;
    if (
      minBudget !== undefined &&
      maxBudget !== undefined &&
      minBudget > maxBudget
    ) {
      throw new BadRequestException('Minimum budget cannot exceed maximum budget.');
    }
    if (
      minArea !== undefined &&
      maxArea !== undefined &&
      minArea > maxArea
    ) {
      throw new BadRequestException('Minimum area cannot exceed maximum area.');
    }
  }

  private validateLaunchLocation(location: { city: string; area: string }) {
    if (
      location.city.trim().toLowerCase() !== 'lahore' ||
      !location.area.trim().toLowerCase().includes('bahria town')
    ) {
      throw new BadRequestException(
        'Client requirements are currently limited to Bahria Town, Lahore.',
      );
    }
  }

  private toBuyerRequirement(
    requirement: HydratedDocument<ClientRequirement>,
  ) {
    const value = requirement.toObject();
    return {
      ...value,
      id: String(requirement._id),
    };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model, Types } from 'mongoose';
import { PropertyMessagingService } from '../crm/property-messaging.service';
import {
  PropertyAdvertisement,
  PropertyAdvertisementDocument,
  PropertyAdvertisementStatus,
} from '../properties/schemas/property-advertisement.schema';
import {
  Property,
  PropertyDocument,
  PropertyStatus,
} from '../properties/schemas/property.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { ClientRequirement } from '../requirements/schemas/client-requirement.schema';
import { RequirementOffer } from '../requirements/schemas/requirement-offer.schema';
import { CreateBuyerInquiryDto } from './dto/create-buyer-inquiry.dto';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { UpdateBuyerProfileDto } from './dto/update-buyer-profile.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { UpdateSavedSearchDto } from './dto/update-saved-search.dto';
import {
  buildPropertySearchFilter,
  normalizeSearchFilters,
} from './buyer-search.utils';
import {
  BuyerNotification,
  BuyerNotificationDocument,
} from './schemas/buyer-notification.schema';
import {
  BuyerProfile,
  BuyerProfileDocument,
} from './schemas/buyer-profile.schema';
import {
  SavedProperty,
  SavedPropertyDocument,
} from './schemas/saved-property.schema';
import {
  SavedSearch,
  SavedSearchDocument,
  SavedSearchFrequency,
} from './schemas/saved-search.schema';

const PROPERTY_CARD_FIELDS =
  'title description purpose propertyType price areaSize areaUnit location.city location.area features images inventoryStatus status isFeatured viewsCount createdAt updatedAt';

@Injectable()
export class BuyerService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
    @InjectModel(PropertyAdvertisement.name)
    private readonly advertisementModel: Model<PropertyAdvertisementDocument>,
    @InjectModel(SavedProperty.name)
    private readonly savedPropertyModel: Model<SavedPropertyDocument>,
    @InjectModel(SavedSearch.name)
    private readonly savedSearchModel: Model<SavedSearchDocument>,
    @InjectModel(BuyerNotification.name)
    private readonly notificationModel: Model<BuyerNotificationDocument>,
    @InjectModel(BuyerProfile.name)
    private readonly profileModel: Model<BuyerProfileDocument>,
    @InjectModel(ClientRequirement.name)
    private readonly requirementModel: Model<ClientRequirement>,
    @InjectModel(RequirementOffer.name)
    private readonly requirementOfferModel: Model<RequirementOffer>,
    private readonly messagingService: PropertyMessagingService,
  ) {}

  async getOverview(buyerId: string) {
    const buyerObjectId = new Types.ObjectId(buyerId);
    const [
      savedProperties,
      activeSavedSearches,
      totalInquiries,
      unreadMessages,
      newMatches,
      requirements,
    ] =
      await Promise.all([
        this.savedPropertyModel.countDocuments({ buyerId: buyerObjectId }).exec(),
        this.savedSearchModel.countDocuments({
          buyerId: buyerObjectId,
          alertsEnabled: true,
          frequency: { $ne: SavedSearchFrequency.OFF },
        }).exec(),
        this.messagingService.getBuyerConversationCount(buyerId),
        this.messagingService.getBuyerUnreadCount(buyerId),
        this.notificationModel.countDocuments({
          buyerId: buyerObjectId,
          readAt: null,
          type: {
            $in: [
              'saved_search_match',
              'property_published',
              'price_changed',
              'availability_changed',
            ],
          },
        }).exec(),
        this.requirementModel
          .find({ buyerId: buyerObjectId })
          .select('_id')
          .lean()
          .exec(),
      ]);
    const receivedOffers = requirements.length
      ? await this.requirementOfferModel.countDocuments({
          requirementId: { $in: requirements.map((requirement) => requirement._id) },
        }).exec()
      : 0;
    return {
      savedProperties,
      activeSavedSearches,
      totalInquiries,
      unreadMessages,
      receivedOffers,
      newMatches,
    };
  }

  async getSavedProperties(buyerId: string, sort: string = 'recent') {
    if (!['recent', 'price_asc', 'price_desc'].includes(sort)) {
      throw new BadRequestException('Unsupported saved-property sort.');
    }
    const links = await this.savedPropertyModel
      .find({ buyerId: new Types.ObjectId(buyerId) })
      .sort({ createdAt: -1 })
      .exec();
    const publicProperties = await this.getPublicPropertiesByIds(
      links.map((link) => String(link.propertyId)),
    );
    const byId = new Map(
      publicProperties.map((property) => [String(property._id), property]),
    );
    const visibleLinks = links.filter((link) => byId.has(String(link.propertyId)));
    if (sort !== 'recent') {
      visibleLinks.sort((left, right) => {
        const leftPrice = byId.get(String(left.propertyId))!.price;
        const rightPrice = byId.get(String(right.propertyId))!.price;
        return sort === 'price_asc' ? leftPrice - rightPrice : rightPrice - leftPrice;
      });
    }
    return {
      items: visibleLinks.map((link) => ({
        propertyId: String(link.propertyId),
        savedAt: (link as SavedPropertyDocument & { createdAt?: Date }).createdAt,
        property: this.serializeProperty(byId.get(String(link.propertyId))!),
      })),
      total: visibleLinks.length,
    };
  }

  async getSavedPropertyIds(buyerId: string) {
    const links = await this.savedPropertyModel
      .find({ buyerId: new Types.ObjectId(buyerId) })
      .select('propertyId')
      .lean()
      .exec();
    return links.map((link) => String(link.propertyId));
  }

  async addSavedProperty(buyerId: string, propertyId: string) {
    const property = await this.getPublicProperty(propertyId);
    let saved: SavedPropertyDocument;
    try {
      saved = await this.savedPropertyModel
        .findOneAndUpdate(
          { buyerId: new Types.ObjectId(buyerId), propertyId: property._id },
          {
            $setOnInsert: {
              buyerId: new Types.ObjectId(buyerId),
              propertyId: property._id,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        .exec();
    } catch (error) {
      if (!this.isDuplicateKey(error)) throw error;
      saved = await this.savedPropertyModel
        .findOne({ buyerId: new Types.ObjectId(buyerId), propertyId: property._id })
        .exec();
    }
    return {
      id: String(saved._id),
      propertyId: String(property._id),
      property: this.serializeProperty(property),
      createdAt: (saved as SavedPropertyDocument & { createdAt?: Date }).createdAt,
    };
  }

  async removeSavedProperty(buyerId: string, propertyId: string) {
    const result = await this.savedPropertyModel
      .deleteOne({
        buyerId: new Types.ObjectId(buyerId),
        propertyId: new Types.ObjectId(propertyId),
      })
      .exec();
    return { deleted: result.deletedCount > 0, propertyId };
  }

  async getSavedSearches(buyerId: string) {
    const searches = await this.savedSearchModel
      .find({ buyerId: new Types.ObjectId(buyerId) })
      .sort({ createdAt: -1 })
      .exec();
    return Promise.all(
      searches.map(async (search) => ({
        ...this.serializeSavedSearch(search),
        matchCount: await this.countMatchingProperties(search.filters ?? {}),
      })),
    );
  }

  async createSavedSearch(buyerId: string, dto: CreateSavedSearchDto) {
    const filters = normalizeSearchFilters(dto.filters);
    const frequency = dto.frequency ?? SavedSearchFrequency.OFF;
    const created = await this.savedSearchModel.create({
      buyerId: new Types.ObjectId(buyerId),
      name: dto.name.trim(),
      filters,
      frequency,
      alertsEnabled: frequency !== SavedSearchFrequency.OFF,
      lastAlertAt: null,
    });
    return {
      ...this.serializeSavedSearch(created),
      matchCount: await this.countMatchingProperties(filters),
    };
  }

  async updateSavedSearch(
    buyerId: string,
    searchId: string,
    dto: UpdateSavedSearchDto,
  ) {
    const existing = await this.savedSearchModel
      .findOne({ _id: searchId, buyerId: new Types.ObjectId(buyerId) })
      .exec();
    if (!existing) throw new NotFoundException('Saved search not found.');
    const effectiveFrequency = dto.frequency ?? existing.frequency;
    if (dto.alertsEnabled === true && effectiveFrequency === SavedSearchFrequency.OFF) {
      throw new BadRequestException('An off-frequency saved search cannot have alerts enabled.');
    }
    const update: Record<string, unknown> = {};
    if (dto.name !== undefined) update.name = dto.name.trim();
    if (dto.filters !== undefined) update.filters = normalizeSearchFilters(dto.filters);
    if (dto.frequency !== undefined) {
      update.frequency = dto.frequency;
      update.alertsEnabled =
        dto.frequency === SavedSearchFrequency.OFF
          ? false
          : dto.alertsEnabled ?? true;
    }
    if (
      dto.alertsEnabled !== undefined &&
      dto.frequency === undefined
    ) {
      update.alertsEnabled = dto.alertsEnabled;
    }
    const search = await this.savedSearchModel
      .findOneAndUpdate(
        { _id: searchId, buyerId: new Types.ObjectId(buyerId) },
        { $set: update },
        { new: true, runValidators: true },
      )
      .exec();
    if (!search) throw new NotFoundException('Saved search not found.');
    return {
      ...this.serializeSavedSearch(search),
      matchCount: await this.countMatchingProperties(search.filters ?? {}),
    };
  }

  async deleteSavedSearch(buyerId: string, searchId: string) {
    const result = await this.savedSearchModel
      .deleteOne({ _id: searchId, buyerId: new Types.ObjectId(buyerId) })
      .exec();
    return { deleted: result.deletedCount > 0, id: searchId };
  }

  async createInquiry(buyerId: string, dto: CreateBuyerInquiryDto) {
    const buyer = await this.userModel
      .findById(buyerId)
      .select('name email phone')
      .exec();
    if (!buyer) throw new NotFoundException('Buyer not found.');
    const conversation = await this.messagingService.startBuyerConversation(
      dto.propertyId,
      buyerId,
      {
        visitorName: buyer.name,
        visitorEmail: buyer.email,
        visitorPhone: buyer.phone,
      },
    );
    const firstMessage = await this.messagingService.sendBuyerMessage(
      String(conversation.id),
      buyerId,
      {
        content: dto.message,
        idempotencyKey: randomUUID(),
      },
    );
    return {
      conversation: await this.messagingService.getBuyerConversation(
        String(conversation.id),
        buyerId,
      ),
      firstMessage,
    };
  }

  getInquiries(buyerId: string) {
    return this.messagingService.getBuyerConversations(buyerId);
  }

  getConversation(buyerId: string, conversationId: string) {
    return this.messagingService.getBuyerConversation(conversationId, buyerId);
  }

  getMessages(
    buyerId: string,
    conversationId: string,
    before?: string,
    limit?: string,
  ) {
    return this.messagingService.getBuyerMessages(
      conversationId,
      buyerId,
      before,
      limit,
    );
  }

  sendMessage(
    buyerId: string,
    conversationId: string,
    content: string,
    idempotencyKey: string,
  ) {
    return this.messagingService.sendBuyerMessage(conversationId, buyerId, {
      content,
      idempotencyKey,
    });
  }

  async getRecommendations(buyerId: string) {
    const profile = await this.profileModel
      .findOne({ buyerId: new Types.ObjectId(buyerId) })
      .lean()
      .exec();
    const savedSearch = await this.savedSearchModel
      .findOne({ buyerId: new Types.ObjectId(buyerId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const preferenceFilters: Record<string, string> = {};
    const preferences = profile?.preferences as Record<string, unknown> | undefined;
    if (preferences?.preferredCity) {
      preferenceFilters.city = String(preferences.preferredCity);
    }
    const preferredLocations = preferences?.preferredLocations as string[] | undefined;
    if (preferredLocations?.length) {
      preferenceFilters.area = preferredLocations[0];
    }
    const preferenceTypes = preferences?.propertyTypes as string[] | undefined;
    if (preferenceTypes?.length) preferenceFilters.propertyType = preferenceTypes[0];
    const purposes = preferences?.purposes as string[] | undefined;
    if (purposes?.length) preferenceFilters.purpose = purposes[0];
    if (preferences?.budgetMin !== undefined) {
      preferenceFilters.minPrice = String(preferences.budgetMin);
    }
    if (preferences?.budgetMax !== undefined) {
      preferenceFilters.maxPrice = String(preferences.budgetMax);
    }
    const usedPersonalization = Object.keys(preferenceFilters).length > 0;
    const filters = normalizeSearchFilters(
      usedPersonalization ? preferenceFilters : savedSearch?.filters ?? {},
    );
    const query = buildPropertySearchFilter(filters);
    const activeAdvertisements = await this.activeAdvertisements();
    if (!activeAdvertisements.length) {
      return {
        items: [],
        personalized:
          usedPersonalization ||
          Boolean(savedSearch && Object.keys(savedSearch.filters ?? {}).length),
      };
    }
    const activeAdvertisementIds = activeAdvertisements.map((ad) => ad.propertyId);
    const savedIds = await this.getSavedPropertyIds(buyerId);
    const properties = await this.propertyModel
      .find({
        ...query,
        _id: {
          $in: activeAdvertisementIds,
          ...(savedIds.length ? { $nin: savedIds.map((id) => new Types.ObjectId(id)) } : {}),
        },
        $or: activeAdvertisements.map((ad) => ({
          _id: ad.propertyId,
          agentId: ad.agentId,
        })),
      })
      .select(PROPERTY_CARD_FIELDS)
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(12)
      .lean()
      .exec();
    return {
      items: properties.map((property) => this.serializeProperty(property)),
      personalized:
        usedPersonalization ||
        Boolean(savedSearch && Object.keys(savedSearch.filters ?? {}).length),
    };
  }

  async getNotifications(buyerId: string, limit = 30) {
    const boundedLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const filter = { buyerId: new Types.ObjectId(buyerId) };
    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ occurredAt: -1, _id: -1 })
        .limit(boundedLimit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
      this.notificationModel.countDocuments({ ...filter, readAt: null }).exec(),
    ]);
    return {
      items: notifications.map((notification) => ({
        id: String(notification._id),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        readAt: notification.readAt ?? null,
        createdAt: notification.occurredAt,
        propertyId: notification.propertyId
          ? String(notification.propertyId)
          : undefined,
        conversationId: notification.conversationId
          ? String(notification.conversationId)
          : undefined,
        requirementId: notification.requirementId
          ? String(notification.requirementId)
          : undefined,
        offerId: notification.offerId
          ? String(notification.offerId)
          : undefined,
      })),
      unreadCount,
      total,
    };
  }

  async markNotificationRead(buyerId: string, notificationId: string) {
    const notification = await this.notificationModel
      .findOneAndUpdate(
        { _id: notificationId, buyerId: new Types.ObjectId(buyerId) },
        { $set: { readAt: new Date() } },
        { new: true },
      )
      .exec();
    if (!notification) throw new NotFoundException('Notification not found.');
    return { id: String(notification._id), readAt: notification.readAt };
  }

  async markAllNotificationsRead(buyerId: string) {
    const result = await this.notificationModel
      .updateMany(
        { buyerId: new Types.ObjectId(buyerId), readAt: null },
        { $set: { readAt: new Date() } },
      )
      .exec();
    return { updated: result.modifiedCount };
  }

  async getProfile(buyerId: string) {
    const [buyer, profile] = await Promise.all([
      this.userModel.findById(buyerId).select('name email phone').lean().exec(),
      this.profileModel.findOne({ buyerId: new Types.ObjectId(buyerId) }).lean().exec(),
    ]);
    if (!buyer) throw new NotFoundException('Buyer not found.');
    return {
      name: buyer.name,
      email: buyer.email,
      phone: buyer.phone ?? null,
      preferences: {
        preferredCity: profile?.preferences?.preferredCity ?? '',
        preferredLocations: profile?.preferences?.preferredLocations ?? [],
        budgetMin: profile?.preferences?.budgetMin ?? null,
        budgetMax: profile?.preferences?.budgetMax ?? null,
        propertyTypes: profile?.preferences?.propertyTypes ?? [],
        purposes: profile?.preferences?.purposes ?? [],
        notifications: profile?.preferences?.notifications ?? {
          inApp: true,
          email: false,
        },
      },
    };
  }

  async updateProfile(buyerId: string, dto: UpdateBuyerProfileDto) {
    const userUpdate: Record<string, unknown> = {};
    for (const field of ['name', 'email', 'phone'] as const) {
      if (dto[field] !== undefined) {
        userUpdate[field] =
          field === 'email' ? dto.email!.trim().toLowerCase() : dto[field]?.trim() || null;
      }
    }
    if (dto.email) {
      const emailOwner = await this.userModel
        .findOne({ email: dto.email.trim().toLowerCase(), _id: { $ne: buyerId } })
        .select('_id')
        .lean()
        .exec();
      if (emailOwner) throw new BadRequestException('This email address is already in use.');
    }
    const preferenceUpdate: Record<string, unknown> = dto.preferences
      ? { ...dto.preferences }
      : {};
    if (dto.preferences) {
      const currentPreferences = await this.profileModel
        .findOne({ buyerId: new Types.ObjectId(buyerId) })
        .select('preferences.budgetMin preferences.budgetMax')
        .lean()
        .exec();
      const budgetMin =
        dto.preferences.budgetMin ?? currentPreferences?.preferences?.budgetMin;
      const budgetMax =
        dto.preferences.budgetMax ?? currentPreferences?.preferences?.budgetMax;
      if (budgetMin != null && budgetMax != null && budgetMin > budgetMax) {
        throw new BadRequestException('budgetMin cannot be greater than budgetMax.');
      }
      if (dto.preferences.preferredCity !== undefined) {
        preferenceUpdate.preferredCity = dto.preferences.preferredCity.trim();
      }
      if (dto.preferences.preferredLocations !== undefined) {
        preferenceUpdate.preferredLocations =
          dto.preferences.preferredLocations.map((location) => location.trim());
      }
    }
    if (Object.keys(userUpdate).length) {
      try {
        await this.userModel.updateOne({ _id: buyerId }, { $set: userUpdate }).exec();
      } catch (error) {
        if (this.isDuplicateKey(error)) {
          throw new BadRequestException('This email address is already in use.');
        }
        throw error;
      }
    }
    if (Object.keys(preferenceUpdate).length) {
      await this.profileModel
        .findOneAndUpdate(
          { buyerId: new Types.ObjectId(buyerId) },
          {
            $set: Object.fromEntries(Object.entries(preferenceUpdate).map(([key, value]) => [
              `preferences.${key}`,
              value,
            ])),
            $setOnInsert: { buyerId: new Types.ObjectId(buyerId) },
          },
          { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        )
        .exec();
    }
    return this.getProfile(buyerId);
  }

  async getNotificationPreferences(buyerId: string) {
    const profile = await this.getOrCreateProfile(buyerId);
    return profile.preferences?.notifications ?? { inApp: true, email: false };
  }

  async updateNotificationPreferences(
    buyerId: string,
    dto: UpdateNotificationPreferencesDto,
  ) {
    const update = Object.fromEntries(Object.entries(dto).map(([key, value]) => [
      `preferences.notifications.${key}`,
      value,
    ]));
    const profile = await this.profileModel
      .findOneAndUpdate(
        { buyerId: new Types.ObjectId(buyerId) },
        {
          $set: update,
          $setOnInsert: { buyerId: new Types.ObjectId(buyerId) },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      )
      .exec();
    return profile.preferences?.notifications ?? { inApp: true, email: false };
  }

  private async getOrCreateProfile(buyerId: string) {
    return this.profileModel
      .findOneAndUpdate(
        { buyerId: new Types.ObjectId(buyerId) },
        { $setOnInsert: { buyerId: new Types.ObjectId(buyerId) } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  private async countMatchingProperties(filters: Record<string, string>) {
    const activeAdvertisements = await this.activeAdvertisements();
    if (!activeAdvertisements.length) return 0;
    const properties = await this.propertyModel
      .find({
        ...buildPropertySearchFilter(filters),
        _id: { $in: activeAdvertisements.map((ad) => ad.propertyId) },
        $or: activeAdvertisements.map((ad) => ({
          _id: ad.propertyId,
          agentId: ad.agentId,
        })),
      })
      .select('_id agentId')
      .lean()
      .exec();
    return properties.length;
  }

  private async getPublicProperty(propertyId: string) {
    const properties = await this.getPublicPropertiesByIds([propertyId]);
    if (!properties.length) {
      throw new NotFoundException('This property is not currently available.');
    }
    return properties[0];
  }

  private async getPublicPropertiesByIds(propertyIds: string[]) {
    if (!propertyIds.length) return [];
    const validIds = propertyIds.filter((id) => Types.ObjectId.isValid(id));
    if (!validIds.length) return [];
    const ads = await this.activeAdvertisements();
    const eligibleAds = ads.filter((ad) =>
      validIds.includes(String(ad.propertyId)),
    );
    if (!eligibleAds.length) return [];
    const properties = await this.propertyModel
      .find({
        _id: { $in: eligibleAds.map((ad) => ad.propertyId) },
        $or: eligibleAds.map((ad) => ({
          _id: ad.propertyId,
          agentId: ad.agentId,
        })),
        status: PropertyStatus.PUBLISHED,
        inventoryStatus: 'available',
        adminHidden: { $ne: true },
        adminRemoved: { $ne: true },
        agentArchived: { $ne: true },
      })
      .select(PROPERTY_CARD_FIELDS)
      .lean()
      .exec();
    return properties;
  }

  private async activeAdvertisements() {
    return this.advertisementModel
      .find({ status: PropertyAdvertisementStatus.PUBLISHED })
      .select('propertyId agentId')
      .lean()
      .exec();
  }

  private serializeProperty(property: any) {
    const location = property.location ?? {};
    const id = String(property._id);
    return {
      _id: id,
      id,
      title: property.title,
      description: property.description,
      purpose: property.purpose,
      propertyType: property.propertyType,
      price: property.price,
      areaSize: property.areaSize,
      areaUnit: property.areaUnit,
      location: { city: location.city, area: location.area },
      features: property.features ?? {},
      images: property.images ?? [],
      status: property.status,
      inventoryStatus: property.inventoryStatus,
      availabilityStatus: property.inventoryStatus,
      isFeatured: property.isFeatured ?? false,
      viewsCount: property.viewsCount ?? 0,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    };
  }

  private serializeSavedSearch(search: SavedSearchDocument) {
    return {
      id: String(search._id),
      name: search.name,
      filters: search.filters ?? {},
      frequency: search.frequency,
      alertsEnabled: search.alertsEnabled,
      createdAt: (search as SavedSearchDocument & { createdAt?: Date }).createdAt,
      lastAlertAt: search.lastAlertAt ?? null,
    };
  }

  private isDuplicateKey(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    );
  }
}

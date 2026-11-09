import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomUUID } from 'crypto';
import { Model, Types } from 'mongoose';
import { Property, PropertyDocument, PropertyStatus } from './schemas/property.schema';
import {
  PropertyAdvertisement,
  PropertyAdvertisementDocument,
  PropertyAdvertisementStatus,
} from './schemas/property-advertisement.schema';
import {
  BuyerNotification,
  BuyerNotificationDocument,
  BuyerNotificationType,
} from '../buyer/schemas/buyer-notification.schema';
import {
  BuyerProfile,
  BuyerProfileDocument,
} from '../buyer/schemas/buyer-profile.schema';
import {
  SavedSearch,
  SavedSearchDocument,
  SavedSearchFrequency,
} from '../buyer/schemas/saved-search.schema';
import { buildPropertySearchFilter } from '../buyer/buyer-search.utils';
import { CreatePropertyDto } from './dto/create-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { escapeRegExp } from '../../common/utils/escape-regexp';
import { UserRole } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import {
  PropertyAnalyticsEvent,
  PropertyAnalyticsEventDocument,
  PropertyAnalyticsEventType,
} from './schemas/property-analytics-event.schema';
import {
  PropertyAnalyticsDeduplication,
  PropertyAnalyticsDeduplicationDocument,
} from './schemas/property-analytics-deduplication.schema';
import {
  PropertyLocationShare,
  PropertyLocationShareDocument,
} from './schemas/property-location-share.schema';
import {
  AccessPropertyLocationDto,
  CreatePropertyLocationShareDto,
  ManagePropertyLocationDto,
} from './dto/manage-property-location.dto';
import {
  createLocationShareToken,
  decryptPrivateLocation,
  encryptPrivateLocation,
  type ExactPropertyLocation,
  hashLocationShareToken,
  toPublicProperty,
} from './property-location-sharing.utils';
import {
  PropertyImageStorageService,
  type UploadedPropertyImage,
} from './property-image-storage.service';

const ROOM_COUNTS = new Set([
  'attachedBathrooms', 'tvLounges', 'drawingRooms', 'diningRooms', 'powderRooms',
  'kitchens', 'additionalKitchens', 'serviceKitchens', 'pantries', 'studyRooms',
  'prayerRooms', 'familyLounges', 'guestRooms', 'dressingRooms', 'storeRooms',
  'laundryRooms', 'servantQuarters', 'servantBathrooms', 'basementRooms', 'lobbies',
  'receptionAreas', 'homeOffices', 'homeGyms', 'homeTheatres', 'steamRooms',
]);
const OUTDOOR_COUNTS = new Set([
  'terraces', 'balconies', 'openTerraces', 'roofAccess', 'lawnGardens', 'frontYards',
  'backyards', 'courtyardsPatios', 'verandas', 'carPorches', 'coveredGarages',
  'openParking', 'basementParking', 'rooftopSittingAreas', 'bbqAreas',
]);
const INTERIOR_OPTIONS = new Set([
  'tiles', 'marbleFlooring', 'woodenFlooring', 'builtInWardrobes', 'fittedKitchen',
  'kitchenAppliances', 'falseCeiling', 'doubleGlazedWindows', 'centralAc',
  'heatingSystem', 'solarSystem', 'upsGeneratorBackup', 'waterTank',
  'waterFiltration', 'lift', 'intercom', 'cctv', 'broadbandInternet',
]);
const COMMUNITY_OPTIONS = new Set([
  'gatedCommunity', 'securityStaff', 'maintenanceStaff', 'mosque', 'park',
  'childrensPlayArea', 'communityCentre', 'swimmingPool', 'communityGym',
  'sportsArea', 'walkingTrack', 'wasteDisposal',
]);
const NEARBY_OPTIONS = new Set([
  'school', 'hospital', 'market', 'mosque', 'publicTransport',
]);

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
    @InjectModel(PropertyAnalyticsEvent.name)
    private analyticsEventModel: Model<PropertyAnalyticsEventDocument>,
    @InjectModel(PropertyLocationShare.name)
    private locationShareModel: Model<PropertyLocationShareDocument>,
    private usersService: UsersService,
    private configService: ConfigService,
    private readonly imageStorage: PropertyImageStorageService,
    @Optional()
    @InjectModel(PropertyAdvertisement.name)
    private readonly advertisementModel?: Model<PropertyAdvertisementDocument>,
    @Optional()
    @InjectModel(SavedSearch.name)
    private readonly savedSearchModel?: Model<SavedSearchDocument>,
    @Optional()
    @InjectModel(BuyerNotification.name)
    private readonly buyerNotificationModel?: Model<BuyerNotificationDocument>,
    @Optional()
    @InjectModel(BuyerProfile.name)
    private readonly buyerProfileModel?: Model<BuyerProfileDocument>,
    @Optional()
    @InjectModel(PropertyAnalyticsDeduplication.name)
    private readonly analyticsDeduplicationModel?: Model<PropertyAnalyticsDeduplicationDocument>,
  ) {}

  async create(createPropertyDto: CreatePropertyDto, agentId: string): Promise<PropertyDocument> {
    this.validateFeatureGroups(createPropertyDto.features);
    const inventoryOnly = createPropertyDto.submissionMode === 'inventory';
    const createdProperty = new this.propertyModel({
      ...createPropertyDto,
      agentId: new Types.ObjectId(agentId),
      status: inventoryOnly
        ? PropertyStatus.AVAILABLE
        : PropertyStatus.PENDING_APPROVAL,
      inventoryStatus: PropertyStatus.AVAILABLE,
    });
    const property = await createdProperty.save();
    if (!inventoryOnly && this.advertisementModel) {
      try {
        await this.advertisementModel.create({
          propertyId: property._id,
          agentId: new Types.ObjectId(agentId),
          status: PropertyAdvertisementStatus.PENDING_REVIEW,
        });
      } catch (error) {
        try {
          await this.advertisementModel.deleteOne({ propertyId: property._id }).exec();
          await this.propertyModel.deleteOne({ _id: property._id }).exec();
        } catch (cleanupError) {
          this.logger.error(
            `Failed to roll back property '${String(property._id)}' after advertisement creation failed`,
            cleanupError instanceof Error ? cleanupError.stack : String(cleanupError),
          );
        }
        throw error;
      }
    }
    return property;
  }

  async update(
    id: string,
    updatePropertyDto: CreatePropertyDto,
    requester: { id: string; role: string },
  ): Promise<PropertyDocument> {
    this.validateFeatureGroups(updatePropertyDto.features);
    const current = await this.findByIdForManager(id, requester);
    if (updatePropertyDto.images !== undefined) {
      throw new BadRequestException(
        'Manage listing photos through the property image endpoints.',
      );
    }
    const fields = { ...updatePropertyDto };
    delete fields.images;
    delete fields.submissionMode;
    const updated = await this.propertyModel
      .findByIdAndUpdate(id, { $set: fields }, { new: true, runValidators: true })
      .exec();
    if (!updated) throw new NotFoundException(`Property with ID '${id}' not found`);
    if (Number(current.price) !== Number(updated.price)) {
      await this.notifyBuyerSearches(
        String(updated._id),
        BuyerNotificationType.PRICE_CHANGED,
        (updated as PropertyDocument & { updatedAt?: Date }).updatedAt ?? new Date(),
        `Price changed from PKR ${current.price} to PKR ${updated.price}.`,
      );
    }
    return updated;
  }

  async archive(
    id: string,
    requester: { id: string; role: string },
    confirmation: string,
  ) {
    if (confirmation !== 'ARCHIVE PROPERTY') {
      throw new BadRequestException('Explicit archive confirmation is required.');
    }
    const property = await this.findByIdForManager(id, requester);
    const now = new Date();
    const ownerFilter = requester.role === UserRole.ADMIN
      ? {}
      : { agentId: new Types.ObjectId(requester.id) };
    await this.locationShareModel.updateMany(
      {
        propertyId: property._id,
        revokedAt: null,
        expiresAt: { $gt: now },
      },
      { $set: { revokedAt: now } },
    ).exec();
    if (!property.agentArchived) {
      const updated = await this.propertyModel.findOneAndUpdate(
        { _id: property._id, agentArchived: { $ne: true }, ...ownerFilter },
        {
          $set: {
            agentArchived: true,
            agentArchivedAt: now,
            agentArchivedBy: new Types.ObjectId(requester.id),
          },
        },
        { new: true, runValidators: true },
      ).exec();
      if (!updated) {
        throw new NotFoundException(`Property with ID '${id}' not found`);
      }
    }
    if (this.advertisementModel) {
      await this.advertisementModel.updateOne(
        {
          propertyId: property._id,
          status: {
            $in: [
              PropertyAdvertisementStatus.PENDING_REVIEW,
              PropertyAdvertisementStatus.PUBLISHED,
              PropertyAdvertisementStatus.PAUSED,
            ],
          },
        },
        {
          $set: {
            status: PropertyAdvertisementStatus.ENDED,
            endedAt: now,
          },
        },
      ).exec();
    }
    return { archived: true, propertyId: String(property._id) };
  }

  async restore(
    id: string,
    requester: { id: string; role: string },
    confirmation: string,
  ) {
    if (confirmation !== 'RESTORE PROPERTY') {
      throw new BadRequestException('Explicit restore confirmation is required.');
    }
    const property = await this.findByIdForManager(id, requester);
    if (!property.agentArchived) {
      return { archived: false, propertyId: String(property._id) };
    }
    const ownerFilter = requester.role === UserRole.ADMIN
      ? {}
      : { agentId: new Types.ObjectId(requester.id) };
    if (this.advertisementModel) {
      await this.advertisementModel.updateOne(
        {
          propertyId: property._id,
          status: {
            $in: [
              PropertyAdvertisementStatus.PENDING_REVIEW,
              PropertyAdvertisementStatus.PUBLISHED,
              PropertyAdvertisementStatus.PAUSED,
            ],
          },
        },
        {
          $set: {
            status: PropertyAdvertisementStatus.ENDED,
            endedAt: new Date(),
          },
        },
      ).exec();
    }
    const updated = await this.propertyModel.findOneAndUpdate(
      { _id: property._id, ...ownerFilter },
      {
        $set: { agentArchived: false },
        $unset: { agentArchivedAt: 1, agentArchivedBy: 1 },
      },
      { new: true, runValidators: true },
    ).exec();
    if (!updated) {
      throw new NotFoundException(`Property with ID '${id}' not found`);
    }
    return { archived: false, propertyId: String(updated._id) };
  }

  readImage(filename: string) {
    return this.imageStorage.read(filename);
  }

  async uploadImages(
    id: string,
    files: UploadedPropertyImage[],
    requester: { id: string; role: string },
  ) {
    const property = await this.findByIdForManager(id, requester);
    if (files.length === 0) throw new BadRequestException('Select at least one image to upload.');
    const existingImages = property.images ?? [];
    const saved = [] as Awaited<ReturnType<PropertyImageStorageService['save']>>[];
    const metadataByChecksum = new Map(
      (property.imageMetadata ?? [])
        .filter((image) => image.checksum)
        .map((image) => [image.checksum as string, image.url]),
    );
    const incomingChecksums = files.map((file) => this.imageStorage.fingerprint(file));
    const newImageCount = new Set(
      incomingChecksums.filter((checksum) => !metadataByChecksum.has(checksum)),
    ).size;
    if (existingImages.length + newImageCount > 10) {
      throw new BadRequestException('A listing can have no more than 10 images.');
    }

    const uploaded: string[] = [];
    try {
      for (const file of files) {
        const checksum = this.imageStorage.fingerprint(file);
        const existingUrl = metadataByChecksum.get(checksum);
        if (existingUrl) {
          uploaded.push(existingUrl);
          continue;
        }
        const image = await this.imageStorage.save(file);
        saved.push(image);
        metadataByChecksum.set(image.checksum, image.url);
        uploaded.push(image.url);
      }
    } catch (error) {
      for (const image of saved) {
        try {
          await this.imageStorage.remove(image.filename);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to clean up unreferenced property image '${image.filename}'`,
            cleanupError instanceof Error ? cleanupError.stack : String(cleanupError),
          );
        }
      }
      throw error;
    }

    if (saved.length === 0) {
      return {
        images: existingImages,
        imageMetadata: property.imageMetadata ?? [],
        uploaded,
      };
    }

    try {
      const newImages = saved.map(({ url }) => url);
      const nextImages = [...existingImages, ...newImages];
      const existingMetadata = property.imageMetadata ?? [];
      const nextMetadata = [
        ...existingMetadata.map((image, index) => ({
          url: image.url,
          filename: image.filename,
          contentType: image.contentType,
          size: image.size,
          checksum: image.checksum,
          uploadedAt: image.uploadedAt,
          order: index,
          isCover: index === 0,
        })),
        ...saved.map((image, index) => ({
          url: image.url,
          filename: image.filename,
          contentType: image.contentType,
          size: image.size,
          checksum: image.checksum,
          order: existingImages.length + index,
          isCover: existingImages.length === 0 && index === 0,
          uploadedAt: new Date(),
        })),
      ];
      const updated = await this.propertyModel
        .findByIdAndUpdate(
          id,
          { $set: { images: nextImages, imageMetadata: nextMetadata } },
          { new: true, runValidators: true },
        )
        .exec();
      if (!updated) throw new NotFoundException(`Property with ID '${id}' not found`);
      return { images: nextImages, imageMetadata: nextMetadata, uploaded };
    } catch (error) {
      for (const image of saved) {
        try {
          await this.removeStoredImageIfUnreferenced(image.filename);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to clean up unreferenced property image '${image.filename}'`,
            cleanupError instanceof Error ? cleanupError.stack : String(cleanupError),
          );
        }
      }
      throw error;
    }
  }

  async reorderImages(
    id: string,
    images: string[],
    requester: { id: string; role: string },
  ) {
    const property = await this.findByIdForManager(id, requester);
    const currentImages = property.images ?? [];
    if (
      images.length !== currentImages.length ||
      new Set(images).size !== images.length ||
      images.some((image) => !currentImages.includes(image))
    ) {
      throw new BadRequestException('Image order must include each saved image exactly once.');
    }

    const imageMetadata = (property.imageMetadata ?? []).map((image) => {
      const order = images.indexOf(image.url);
      return {
        url: image.url,
        filename: image.filename,
        contentType: image.contentType,
        size: image.size,
        checksum: image.checksum,
        uploadedAt: image.uploadedAt,
        order,
        isCover: order === 0,
      };
    });
    const updated = await this.propertyModel
      .findByIdAndUpdate(
        id,
        { $set: { images, imageMetadata } },
        { runValidators: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`Property with ID '${id}' not found`);
    return { images, imageMetadata };
  }

  async removeImage(
    id: string,
    url: string,
    requester: { id: string; role: string },
  ) {
    const property = await this.findByIdForManager(id, requester);
    const images = property.images ?? [];
    if (!images.includes(url)) {
      const filename = this.imageStorage.filenameForManagedUrl(url);
      const fileDeleted = filename
        ? await this.removeStoredImageIfUnreferenced(filename)
        : true;
      return { removed: false, fileDeleted };
    }
    const removedMetadata = (property.imageMetadata ?? []).find((image) => image.url === url);
    const nextImages = images.filter((image) => image !== url);
    const nextMetadata = (property.imageMetadata ?? [])
      .filter((image) => image.url !== url)
      .map((image) => {
        const order = nextImages.indexOf(image.url);
        return {
          url: image.url,
          filename: image.filename,
          contentType: image.contentType,
          size: image.size,
          checksum: image.checksum,
          uploadedAt: image.uploadedAt,
          order,
          isCover: order === 0,
        };
      });
    const updated = await this.propertyModel
      .findByIdAndUpdate(
        id,
        { $set: { images: nextImages, imageMetadata: nextMetadata } },
        { runValidators: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`Property with ID '${id}' not found`);

    const fileDeleted = removedMetadata
      ? await this.removeStoredImageIfUnreferenced(removedMetadata.filename)
      : true;
    return { removed: true, fileDeleted };
  }

  private async removeStoredImageIfUnreferenced(filename: string): Promise<boolean> {
    const metadataReference = await this.propertyModel
      .exists({
        $or: [
          { 'imageMetadata.filename': filename },
          { images: { $regex: `${escapeRegExp(filename)}$` } },
        ],
      })
      .exec();
    if (metadataReference) return false;
    try {
      await this.imageStorage.remove(filename);
      return true;
    } catch (error) {
      this.logger.error(
        `Unable to remove unreferenced property image '${filename}'`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  private validateFeatureGroups(features?: CreatePropertyDto['features']): void {
    if (!features) return;
    for (const [group, allowed] of [
      ['rooms', ROOM_COUNTS],
      ['outdoor', OUTDOOR_COUNTS],
    ] as const) {
      const values = features[group];
      if (values === undefined) continue;
      if (!values || typeof values !== 'object' || Array.isArray(values)) {
        throw new BadRequestException(`features.${group} must be an object of counts.`);
      }
      for (const [key, count] of Object.entries(values)) {
        if (!allowed.has(key) || !Number.isInteger(count) || count < 0 || count > 50) {
          throw new BadRequestException(`Invalid features.${group}.${key} count.`);
        }
      }
    }
    for (const [group, allowed] of [
      ['interior', INTERIOR_OPTIONS],
      ['community', COMMUNITY_OPTIONS],
      ['nearby', NEARBY_OPTIONS],
    ] as const) {
      const values = features[group];
      if (values === undefined) continue;
      if (!Array.isArray(values) || values.some((value) => !allowed.has(value))) {
        throw new BadRequestException(`Invalid features.${group} selection.`);
      }
    }
  }

  async findAll(queryDto: QueryPropertyDto) {
    const {
      city,
      area,
      agentId,
      agencyName,
      purpose,
      propertyType,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      areaUnit,
      bedrooms,
      feature,
      page = 1,
      limit = 20,
      sortBy = 'newest',
    } = queryDto;

    const filter: Record<string, any> = {
      status: PropertyStatus.PUBLISHED,
      adminHidden: { $ne: true },
      adminRemoved: { $ne: true },
      agentArchived: { $ne: true },
    };

    if (city) filter['location.city'] = new RegExp(escapeRegExp(city), 'i');
    if (area) filter['location.area'] = new RegExp(escapeRegExp(area), 'i');
    if (agentId && agencyName) {
      throw new BadRequestException('Filter listings by an agent or an agency, not both.');
    }
    if (agentId) filter.agentId = new Types.ObjectId(agentId);
    if (agencyName) {
      const agentIds = await this.usersService.findPublicAgentIdsForAgency(agencyName);
      filter.agentId = {
        $in: agentIds.map((id) => new Types.ObjectId(id)),
      };
    }
    if (purpose) filter.purpose = purpose;
    if (propertyType) filter.propertyType = propertyType;
    if (areaUnit) filter.areaUnit = areaUnit;

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    if (minArea !== undefined || maxArea !== undefined) {
      filter.areaSize = {};
      if (minArea !== undefined) filter.areaSize.$gte = minArea;
      if (maxArea !== undefined) filter.areaSize.$lte = maxArea;
    }

    if (bedrooms !== undefined) {
      filter['features.bedrooms'] = bedrooms;
    }
    if (feature) {
      const [group, key] = feature.split(':');
      const countOptions = group === 'rooms'
        ? ROOM_COUNTS
        : group === 'outdoor'
          ? OUTDOOR_COUNTS
          : undefined;
      const selectionOptions = group === 'interior'
        ? INTERIOR_OPTIONS
        : group === 'community'
          ? COMMUNITY_OPTIONS
          : group === 'nearby'
            ? NEARBY_OPTIONS
            : undefined;
      if (countOptions) {
        if (!countOptions.has(key)) {
          throw new BadRequestException('Unknown property feature filter.');
        }
        filter[`features.${group}.${key}`] = { $gt: 0 };
      } else if (selectionOptions?.has(key)) {
        filter[`features.${group}`] = key;
      } else {
        throw new BadRequestException('Unknown property feature filter.');
      }
    }

    let sort: Record<string, any> = { createdAt: -1 };
    if (sortBy === 'price_asc') sort = { price: 1 };
    if (sortBy === 'price_desc') sort = { price: -1 };
    if (sortBy === 'featured') sort = { isFeatured: -1, createdAt: -1 };

    let activeAdvertisements: Array<{
      _id: Types.ObjectId;
      propertyId: Types.ObjectId;
    }> = [];
    if (this.advertisementModel) {
      activeAdvertisements = await this.advertisementModel
        .find({ status: PropertyAdvertisementStatus.PUBLISHED })
        .select('_id propertyId')
        .exec();
      filter._id = {
        $in: activeAdvertisements.map((ad) => ad.propertyId),
      };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.propertyModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('agentId', 'name phone agencyName avatarUrl isVerified')
        .exec(),
      this.propertyModel.countDocuments(filter).exec(),
    ]);
    return {
      data: items.map((property): Record<string, unknown> =>
        toPublicProperty(property),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Public lookup: only PUBLISHED listings are visible, and the agent's email
   * is never exposed. Draft / pending / rejected listings return 404.
   */
  async findById(id: string): Promise<Record<string, unknown>> {
    const property = await this.propertyModel
      .findOne({
        _id: id,
        adminHidden: { $ne: true },
        adminRemoved: { $ne: true },
        agentArchived: { $ne: true },
        status: {
          $in: [
            PropertyStatus.PUBLISHED,
            PropertyStatus.SOLD,
            PropertyStatus.RENTED,
            PropertyStatus.RESERVED,
            PropertyStatus.UNAVAILABLE,
          ],
        },
      })
      .populate('agentId', 'name phone agencyName avatarUrl isVerified city')
      .exec();

    if (!property) {
      throw new NotFoundException(`Property with ID '${id}' not found`);
    }

    if (this.advertisementModel) {
      const advertisement = await this.advertisementModel
        .findOne({ propertyId: property._id })
        .select('status approvedAt')
        .exec();
      const activeListing =
        property.status === PropertyStatus.PUBLISHED &&
        advertisement?.status === PropertyAdvertisementStatus.PUBLISHED;
      const previouslyPublishedAndUnavailable =
        property.status !== PropertyStatus.PUBLISHED &&
        ['sold', 'rented', 'reserved', 'unavailable'].includes(
          property.inventoryStatus,
        ) &&
        advertisement?.status === PropertyAdvertisementStatus.ENDED &&
        Boolean(advertisement.approvedAt);
      if (!activeListing && !previouslyPublishedAndUnavailable) {
        throw new NotFoundException(`Property with ID '${id}' not found`);
      }
    }

    return toPublicProperty(property);
  }

  async getPrivateLocation(
    id: string,
    requester: { id: string; role: string },
  ) {
    await this.findByIdForManager(id, requester);
    const property = await this.propertyModel
      .findById(id)
      .select(
        '+privateLocation +location.address +location.latitude +location.longitude',
      )
      .exec();
    if (!property) {
      throw new NotFoundException(`Property with ID '${id}' not found`);
    }

    const exactLocation = this.readExactLocation(property);
    if (!exactLocation) {
      return { location: null };
    }

    return { location: exactLocation };
  }

  async savePrivateLocation(
    id: string,
    requester: { id: string; role: string },
    location: ManagePropertyLocationDto,
  ) {
    await this.findByIdForManager(id, requester);
    const encryptionKey = this.requireLocationEncryptionKey();
    const property = await this.propertyModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            privateLocation: {
              encryptedData: encryptPrivateLocation(
                {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  address: location.address?.trim() ?? '',
                },
                encryptionKey,
              ),
            },
          },
          $unset: {
            'location.address': 1,
            'location.latitude': 1,
            'location.longitude': 1,
          },
        },
        { new: true, runValidators: true },
      )
      .select('_id')
      .exec();
    if (!property) {
      throw new NotFoundException(`Property with ID '${id}' not found`);
    }
    return { saved: true };
  }

  async listLocationShares(
    propertyId: string,
    requester: { id: string; role: string },
  ) {
    await this.findByIdForManager(propertyId, requester);
    const shares = await this.locationShareModel
      .find({ propertyId: new Types.ObjectId(propertyId) })
      .sort({ createdAt: -1 })
      .select('_id createdAt expiresAt revokedAt')
      .lean()
      .exec();
    return shares.map((share) => ({
      id: String(share._id),
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      revokedAt: share.revokedAt ?? null,
    }));
  }

  async createLocationShare(
    propertyId: string,
    requester: { id: string; role: string },
    dto: CreatePropertyLocationShareDto,
  ) {
    const property = await this.findByIdForManager(propertyId, requester);
    if (
      property.status !== PropertyStatus.PUBLISHED ||
      property.inventoryStatus !== 'available' ||
      property.agentArchived ||
      property.adminHidden ||
      property.adminRemoved
    ) {
      throw new BadRequestException(
        'Exact location links are available only for active, published, available properties.',
      );
    }
    if (!this.advertisementModel) {
      throw new ServiceUnavailableException('Advertisement management is unavailable.');
    }
    const propertyAgentId =
      (property.agentId as unknown as { _id?: Types.ObjectId })?._id ??
      property.agentId;
    const advertisement = await this.advertisementModel
      .findOne({
        propertyId: property._id,
        agentId: propertyAgentId,
        status: PropertyAdvertisementStatus.PUBLISHED,
      })
      .select('publishedAt')
      .exec();
    const advertisementPublishedAt = advertisement?.publishedAt;
    if (!advertisement || !advertisementPublishedAt) {
      throw new BadRequestException(
        'Exact location links require a currently published advertisement.',
      );
    }

    const exactLocation = await this.propertyModel
      .findById(propertyId)
      .select('+privateLocation +privateLocation.encryptedData')
      .exec();
    if (!exactLocation?.privateLocation?.encryptedData) {
      throw new BadRequestException(
        'Save the exact property entrance securely before creating a location link',
      );
    }
    this.readExactLocation(exactLocation);
    this.requireLocationEncryptionKey();

    const recipient = await this.usersService.findBuyerIdentityByEmail(
      dto.recipientEmail.trim(),
    );
    if (!recipient || recipient.role !== UserRole.BUYER) {
      throw new BadRequestException(
        'The recipient must have a registered buyer account',
      );
    }

    const token = createLocationShareToken();
    const ttlHours =
      this.configService.get<number>('propertyLocationShare.ttlHours') ?? 24;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    const frontendBaseUrl =
      this.configService.get<string>(
        'propertyLocationShare.frontendBaseUrl',
      ) ?? 'http://localhost:3000';
    let shareUrl: URL;
    try {
      shareUrl = new URL('/shared-location', frontendBaseUrl);
      if (
        !['http:', 'https:'].includes(shareUrl.protocol) ||
        shareUrl.username ||
        shareUrl.password
      ) {
        throw new Error('Unsupported frontend URL protocol');
      }
    } catch {
      throw new Error('FRONTEND_BASE_URL must be a valid HTTP or HTTPS URL');
    }

    const share = await this.locationShareModel.create({
      propertyId: new Types.ObjectId(propertyId),
      agentId: new Types.ObjectId(requester.id),
      recipientId: new Types.ObjectId(recipient.id),
      advertisementPublishedAt,
      tokenHash: hashLocationShareToken(token),
      expiresAt,
    });
    shareUrl.hash = new URLSearchParams({ token }).toString();

    return {
      id: String(share._id),
      shareUrl: shareUrl.toString(),
      expiresAt,
    };
  }

  async revokeLocationShare(
    propertyId: string,
    shareId: string,
    requester: { id: string; role: string },
  ) {
    await this.findByIdForManager(propertyId, requester);
    const share = await this.locationShareModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(shareId),
          propertyId: new Types.ObjectId(propertyId),
          revokedAt: null,
        },
        { $set: { revokedAt: new Date() } },
        { new: true },
      )
      .select('_id')
      .exec();
    if (!share) {
      const existing = await this.locationShareModel
        .exists({
          _id: new Types.ObjectId(shareId),
          propertyId: new Types.ObjectId(propertyId),
        })
        .exec();
      if (!existing) {
        throw new NotFoundException('Location share not found');
      }
    }
    return { revoked: true };
  }

  async accessPrivateLocation(
    token: AccessPropertyLocationDto['token'],
    requester: { id: string },
  ) {
    const share = await this.locationShareModel
      .findOne({ tokenHash: hashLocationShareToken(token) })
      .select('+tokenHash')
      .exec();
    const inaccessible = () =>
      new NotFoundException(
        'This location link is invalid, expired, revoked, or not authorized for this account. Ask the agent for a new link.',
      );
    if (
      !share ||
      share.revokedAt ||
      share.expiresAt.getTime() <= Date.now() ||
      String(share.recipientId) !== String(requester.id)
    ) {
      throw inaccessible();
    }

    const property = await this.propertyModel
      .findOne({
        _id: share.propertyId,
        status: PropertyStatus.PUBLISHED,
        inventoryStatus: 'available',
        agentArchived: { $ne: true },
        adminHidden: { $ne: true },
        adminRemoved: { $ne: true },
      })
      .select(
        'title location.city location.area agentId +privateLocation +privateLocation.encryptedData',
      )
      .populate('agentId', 'name phone agencyName')
      .exec();
    if (!property) {
      throw inaccessible();
    }
    if (!this.advertisementModel) {
      throw new ServiceUnavailableException('Advertisement management is unavailable.');
    }
    const propertyAgentId =
      (property.agentId as unknown as { _id?: Types.ObjectId })?._id ??
      property.agentId;
    const advertisement = await this.advertisementModel
      .findOne({
        propertyId: property._id,
        agentId: propertyAgentId,
        status: PropertyAdvertisementStatus.PUBLISHED,
      })
      .select('publishedAt')
      .exec();
    const currentPublication = advertisement?.publishedAt;
    if (
      !currentPublication ||
      !share.advertisementPublishedAt ||
      new Date(share.advertisementPublishedAt).getTime() !==
        new Date(currentPublication).getTime()
    ) {
      throw inaccessible();
    }

    if (!property.privateLocation?.encryptedData) {
      throw inaccessible();
    }
    const exactLocation = this.readExactLocation(property);
    if (!exactLocation) {
      throw inaccessible();
    }

    const agent = property.agentId as unknown as {
      name?: string;
      phone?: string;
      agencyName?: string;
    };
    return {
      property: {
        title: property.title,
        city: property.location.city,
        area: property.location.area,
        agent: {
          name: agent.name,
          phone: agent.phone,
          agencyName: agent.agencyName,
        },
      },
      location: exactLocation,
    };
  }

  private requireLocationEncryptionKey(): string {
    const key = this.configService.get<string>(
      'propertyLocationShare.encryptionKey',
    );
    if (!key) {
      throw new ServiceUnavailableException(
        'Secure property location sharing is not configured',
      );
    }
    return key;
  }

  private readExactLocation(property: PropertyDocument): ExactPropertyLocation | null {
    if (property.privateLocation?.encryptedData) {
      const key = this.requireLocationEncryptionKey();
      try {
        return decryptPrivateLocation(
          property.privateLocation.encryptedData,
          key,
        );
      } catch {
        throw new InternalServerErrorException(
          'Private property location data could not be read',
        );
      }
    }

    const legacyLocation = property.location;
    if (
      legacyLocation?.latitude === undefined ||
      legacyLocation.longitude === undefined
    ) {
      return null;
    }
    return {
      latitude: legacyLocation.latitude,
      longitude: legacyLocation.longitude,
      address: legacyLocation.address ?? '',
    };
  }

  async trackPublicEvent(
    propertyId: string,
    type: PropertyAnalyticsEventType | 'property_view' | 'call_click' | 'whatsapp_click',
    visitorId: string,
    userAgent = '',
    viewId?: string,
  ) {
    if (/bot|crawler|spider|headless|preview|facebookexternalhit/i.test(userAgent)) {
      throw new BadRequestException('Automated requests are not counted as public engagement.');
    }
    const property = await this.propertyModel
      .findOne({
        _id: propertyId,
        status: PropertyStatus.PUBLISHED,
        agentArchived: { $ne: true },
      })
      .select('agentId')
      .exec();
    if (!property) {
      throw new NotFoundException(`Property with ID '${propertyId}' not found`);
    }

    const ad = await this.getPublishedAdvertisement(property);
    if (!ad) {
      throw new NotFoundException(`Property with ID '${propertyId}' not found`);
    }

    const visitorSecret = this.configService.get<string>('jwt.secret');
    if (!visitorSecret) {
      throw new ServiceUnavailableException('Analytics visitor privacy key is unavailable.');
    }
    const visitorHash = createHmac('sha256', visitorSecret)
      .update(visitorId)
      .digest('hex');
    const eventType = type as PropertyAnalyticsEventType;
    const now = new Date();
    const hourlyStart = new Date(now.getTime() - 60 * 60_000);
    const recentVisitorEvents = await this.analyticsEventModel
      .countDocuments({
        visitorHash,
        occurredAt: { $gte: hourlyStart },
      })
      .exec();
    if (recentVisitorEvents >= 60) {
      throw new BadRequestException('Too many analytics events. Try again later.');
    }

    if (eventType === PropertyAnalyticsEventType.PROPERTY_VIEW) {
      const visitId = viewId ?? randomUUID();
      const dedupeKey = createHash('sha256')
        .update(`${property._id}:${eventType}:${visitId}`)
        .digest('hex');
      try {
        await this.analyticsEventModel.create({
          propertyId: property._id,
          advertisementId: ad._id,
          agentId: property.agentId,
          type: eventType,
          occurredAt: now,
          visitorHash,
          dedupeKey,
        });
      } catch (error) {
        if (!this.isDuplicateKey(error)) throw error;
        const current = await this.propertyModel
          .findById(property._id)
          .select('viewsCount')
          .exec();
        return {
          tracked: false,
          duplicate: true,
          viewsCount: current?.viewsCount ?? 0,
        };
      }

      const updated = await this.propertyModel
        .findOneAndUpdate(
          { _id: property._id },
          { $inc: { viewsCount: 1 } },
          { new: true },
        )
        .select('viewsCount')
        .exec();
      if (!updated) {
        throw new NotFoundException(`Property with ID '${propertyId}' not found`);
      }
      return { tracked: true, viewsCount: updated.viewsCount ?? 0 };
    }

    const dedupeWindowMs = 5_000;
    const since = new Date(now.getTime() - dedupeWindowMs);
    const existing = await this.analyticsEventModel
      .exists({
        propertyId: property._id,
        type: eventType,
        visitorHash,
        occurredAt: { $gte: since },
      })
      .exec();
    if (existing) return { tracked: false, duplicate: true };

    const bucket = Math.floor(Date.now() / dedupeWindowMs);
    const dedupeKey = createHash('sha256')
      .update(`${property._id}:${eventType}:${visitorHash}:${bucket}`)
      .digest('hex');
    if (!this.analyticsDeduplicationModel) {
      throw new ServiceUnavailableException(
        'Analytics event deduplication is unavailable.',
      );
    }
    const reservationKey = createHash('sha256')
      .update(`${property._id}:${eventType}:${visitorHash}`)
      .digest('hex');
    const reservationExpiresAt = new Date(now.getTime() + dedupeWindowMs);
    try {
      await this.analyticsDeduplicationModel.findOneAndUpdate(
        { key: reservationKey, expiresAt: { $lte: now } },
        { $set: { key: reservationKey, expiresAt: reservationExpiresAt } },
        { upsert: true, new: true, runValidators: true },
      ).exec();
    } catch (error) {
      if (this.isDuplicateKey(error)) {
        return { tracked: false, duplicate: true };
      }
      throw error;
    }
    try {
      await this.analyticsEventModel.create({
        propertyId: property._id,
        advertisementId: ad._id,
        agentId: property.agentId,
        type: eventType,
        occurredAt: new Date(),
        visitorHash,
        dedupeKey,
      });
    } catch (error) {
      if (this.isDuplicateKey(error)) {
        return { tracked: false, duplicate: true };
      }
      try {
        await this.analyticsDeduplicationModel.deleteOne({
          key: reservationKey,
          expiresAt: reservationExpiresAt,
        }).exec();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Analytics event creation and deduplication reservation cleanup both failed.',
        );
      }
      throw error;
    }
    return { tracked: true };
  }

  async getAgentAnalytics(agentId: string, days: number) {
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));

    const events = await this.analyticsEventModel
      .find({
        agentId: new Types.ObjectId(agentId),
        occurredAt: { $gte: startDate },
      })
      .select('propertyId type occurredAt visitorHash')
      .exec();
    const byDate = new Map<string, {
      propertyViews: number;
      uniqueVisitors: Set<string>;
      callClicks: number;
      whatsappClicks: number;
    }>();
    const byProperty = new Map<string, {
      propertyViews: number;
      uniqueVisitors: Set<string>;
      callClicks: number;
      whatsappClicks: number;
    }>();
    const totals = {
      propertyViews: 0,
      uniqueVisitors: new Set<string>(),
      callClicks: 0,
      whatsappClicks: 0,
    };

    for (const event of events) {
      const dateKey = event.occurredAt.toISOString().slice(0, 10);
      const propertyKey = String(event.propertyId);
      const visitorHash = (event as PropertyAnalyticsEventDocument & {
        visitorHash?: string;
      }).visitorHash;
      const ensure = <T extends typeof totals>(
        map: Map<string, T>,
        key: string,
      ): T => {
        let value = map.get(key);
        if (!value) {
          value = {
            propertyViews: 0,
            uniqueVisitors: new Set<string>(),
            callClicks: 0,
            whatsappClicks: 0,
          } as T;
          map.set(key, value);
        }
        return value;
      };
      const dateStats = ensure(byDate, dateKey);
      const propertyStats = ensure(byProperty, propertyKey);
      if (event.type === PropertyAnalyticsEventType.PROPERTY_VIEW) {
        totals.propertyViews += 1;
        dateStats.propertyViews += 1;
        propertyStats.propertyViews += 1;
        if (visitorHash) {
          totals.uniqueVisitors.add(visitorHash);
          dateStats.uniqueVisitors.add(visitorHash);
          propertyStats.uniqueVisitors.add(visitorHash);
        }
      } else if (event.type === PropertyAnalyticsEventType.CALL_CLICK) {
        totals.callClicks += 1;
        dateStats.callClicks += 1;
        propertyStats.callClicks += 1;
      } else if (event.type === PropertyAnalyticsEventType.WHATSAPP_CLICK) {
        totals.whatsappClicks += 1;
        dateStats.whatsappClicks += 1;
        propertyStats.whatsappClicks += 1;
      }
    }

    const daily = Array.from({ length: days }, (_, index) => {
      const date = new Date(startDate);
      date.setUTCDate(startDate.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      const stats = byDate.get(key);
      return {
        date: key,
        propertyViews: stats?.propertyViews ?? 0,
        peopleReached: stats?.uniqueVisitors.size ?? 0,
        callClicks: stats?.callClicks ?? 0,
        whatsappClicks: stats?.whatsappClicks ?? 0,
      };
    });

    const propertyTitles = await this.propertyModel
      .find({ _id: { $in: [...byProperty.keys()] } })
      .select('title')
      .exec();
    const titlesById = new Map(
      propertyTitles.map((property) => [String(property._id), property.title]),
    );
    const properties = [...byProperty.entries()].map(([propertyId, stats]) => ({
      propertyId,
      propertyTitle: titlesById.get(propertyId) ?? 'Property listing',
      propertyViews: stats.propertyViews,
      peopleReached: stats.uniqueVisitors.size,
      callClicks: stats.callClicks,
      whatsappClicks: stats.whatsappClicks,
    }));

    return {
      source: 'database',
      days,
      definition: 'People reached is the number of distinct privacy-preserving visitor identifiers that viewed published ads during the selected period.',
      totals: {
        propertyViews: totals.propertyViews,
        peopleReached: totals.uniqueVisitors.size,
        callClicks: totals.callClicks,
        whatsappClicks: totals.whatsappClicks,
      },
      daily,
      properties,
    };
  }

  async getAgentRecentActivity(agentId: string) {
    const owner = new Types.ObjectId(agentId);
    const [properties, advertisements, events] = await Promise.all([
      this.propertyModel
        .find({ agentId: owner })
        .select('title status createdAt updatedAt moderatedAt')
        .sort({ updatedAt: -1 })
        .limit(20)
        .exec(),
      this.advertisementModel
        ? this.advertisementModel
            .find({ agentId: owner })
            .populate('propertyId', 'title')
            .sort({ updatedAt: -1 })
            .limit(20)
            .exec()
        : Promise.resolve([]),
      this.analyticsEventModel
        .find({ agentId: owner })
        .select('propertyId type occurredAt')
        .populate('propertyId', 'title')
        .sort({ occurredAt: -1 })
        .limit(20)
        .exec(),
    ]);

    const activity: {
      id: string;
      title: string;
      description: string;
      href: string;
      occurredAt: Date;
    }[] = [];

    for (const property of properties) {
      const propertyId = String(property._id);
      const createdAt = (property as PropertyDocument & { createdAt?: Date }).createdAt;
      const updatedAt = (property as PropertyDocument & { updatedAt?: Date }).updatedAt;
      if (createdAt) {
        activity.push({
          id: `${propertyId}-created`,
          title: 'Listing added',
          description: property.title,
          href: `/agent/listings/${propertyId}/edit`,
          occurredAt: createdAt,
        });
      }
      if (property.moderatedAt) {
        activity.push({
          id: `${propertyId}-moderated`,
          title: property.status === PropertyStatus.PUBLISHED
            ? 'Advertisement approved'
            : 'Advertisement rejected',
          description: property.title,
          href: '/agent/ads',
          occurredAt: property.moderatedAt,
        });
      } else if (updatedAt && createdAt && updatedAt.getTime() > createdAt.getTime()) {
        activity.push({
          id: `${propertyId}-updated`,
          title: 'Listing updated',
          description: property.title,
          href: `/agent/listings/${propertyId}/edit`,
          occurredAt: updatedAt,
        });
      }
    }

    for (const advertisement of advertisements) {
      const property = advertisement.propertyId as unknown as
        | {
            _id?: Types.ObjectId;
            title?: string;
          }
        | null;
      const title = property?.title ?? 'Property listing';
      activity.push({
        id: `${String(advertisement._id)}-submitted`,
        title: 'Advertisement submitted',
        description: `${title} · ${advertisement.status}`,
        href: '/agent/ads',
        occurredAt: advertisement.submittedAt,
      });
      if (advertisement.approvedAt) {
        activity.push({
          id: `${String(advertisement._id)}-approved`,
          title: 'Advertisement approved',
          description: title,
          href: '/agent/ads',
          occurredAt: advertisement.approvedAt,
        });
      }
    }

    for (const event of events) {
      const property = event.propertyId as unknown as { title?: string } | null;
      activity.push({
        id: String(event._id),
        title: event.type === PropertyAnalyticsEventType.CALL_CLICK
          ? 'Call button clicked'
          : event.type === PropertyAnalyticsEventType.WHATSAPP_CLICK
            ? 'WhatsApp button clicked'
            : event.type === PropertyAnalyticsEventType.PROPERTY_VIEW
              ? 'Property viewed'
              : 'Property activity',
        description: property?.title ?? 'Property listing',
        href: '/agent/ads',
        occurredAt: event.occurredAt,
      });
    }
    return activity
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
      .slice(0, 10);
  }

  private async getPublishedAdvertisement(property: PropertyDocument) {
    if (!this.advertisementModel) return null;
    return this.advertisementModel
      .findOne({
        propertyId: property._id,
        status: PropertyAdvertisementStatus.PUBLISHED,
      })
      .exec();
  }

  async findAdvertisementsByAgent(agentId: string) {
    if (!this.advertisementModel) return [];
    const advertisements = await this.advertisementModel
      .find({ agentId: new Types.ObjectId(agentId) })
      .populate('propertyId')
      .sort({ createdAt: -1 })
      .exec();
    return advertisements.map((advertisement) => ({
      id: String(advertisement._id),
      propertyId: String(
        (advertisement.propertyId as unknown as { _id: Types.ObjectId })._id ??
          advertisement.propertyId,
      ),
      agentId: String(advertisement.agentId),
      status: advertisement.status,
      submittedAt: advertisement.submittedAt,
      approvedAt: advertisement.approvedAt,
      moderationNotes: advertisement.moderationNotes,
      createdAt: (
        advertisement as PropertyAdvertisementDocument & { createdAt?: Date }
      ).createdAt,
      property: advertisement.propertyId,
    }));
  }

  async submitForAdvertising(
    propertyId: string,
    requester: { id: string; role: string },
  ) {
    const property = await this.findByIdForManager(propertyId, requester);
    if (!this.advertisementModel) {
      throw new ServiceUnavailableException('Advertisement management is unavailable');
    }
    if (property.agentArchived) {
      throw new BadRequestException('Restore this archived property before advertising it.');
    }
    if (
      [PropertyStatus.SOLD, PropertyStatus.RENTED, PropertyStatus.UNAVAILABLE].includes(
        property.inventoryStatus as PropertyStatus,
      )
    ) {
      throw new BadRequestException('Only available or reserved inventory can be advertised.');
    }

    const existing = await this.advertisementModel.findOne({
      propertyId: property._id,
    }).exec();
    if (existing?.status === PropertyAdvertisementStatus.PUBLISHED) return existing;
    if (existing?.status === PropertyAdvertisementStatus.PENDING_REVIEW) return existing;

    let advertisement: PropertyAdvertisementDocument | null;
    try {
      advertisement = await this.advertisementModel.findOneAndUpdate(
        { propertyId: property._id },
        {
          $set: {
            agentId: property.agentId,
            status: PropertyAdvertisementStatus.PENDING_REVIEW,
            submittedAt: new Date(),
            moderationNotes: null,
          },
          $unset: { approvedAt: 1, moderatedBy: 1, pausedAt: 1, endedAt: 1 },
        },
        { new: true, upsert: true, runValidators: true },
      ).exec();
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) {
        throw error;
      }
      const competingAdvertisement = await this.advertisementModel.findOne({
        propertyId: property._id,
      }).exec();
      if (
        competingAdvertisement?.status === PropertyAdvertisementStatus.PENDING_REVIEW ||
        competingAdvertisement?.status === PropertyAdvertisementStatus.PUBLISHED
      ) {
        return competingAdvertisement;
      }
      throw error;
    }
    await this.propertyModel.updateOne(
      { _id: property._id },
      { $set: { status: PropertyStatus.PENDING_APPROVAL } },
    ).exec();
    return advertisement;
  }

  async updateAdvertisementStatus(
    advertisementId: string,
    status: string,
    requester: { id: string; role: string },
  ) {
    if (!this.advertisementModel) {
      throw new ServiceUnavailableException('Advertisement management is unavailable');
    }
    const allowed = [
      PropertyAdvertisementStatus.PAUSED,
      PropertyAdvertisementStatus.ENDED,
      PropertyAdvertisementStatus.PUBLISHED,
    ];
    if (!allowed.includes(status as PropertyAdvertisementStatus)) {
      throw new BadRequestException('Unsupported advertisement status.');
    }
    const advertisement = await this.advertisementModel
      .findById(advertisementId)
      .exec();
    if (
      !advertisement ||
      (![UserRole.ADMIN, UserRole.AGENT].includes(requester.role as UserRole)) ||
      (requester.role !== UserRole.ADMIN &&
        String(advertisement.agentId) !== String(requester.id))
    ) {
      throw new NotFoundException('Advertisement not found');
    }
    const previousAdvertisementState = {
      status: advertisement.status,
      publishedAt: advertisement.publishedAt,
      pausedAt: advertisement.pausedAt,
      endedAt: advertisement.endedAt,
    };
    let property: PropertyDocument | null = null;
    if (status === PropertyAdvertisementStatus.PUBLISHED) {
      if (
        !advertisement.approvedAt ||
        ![
          PropertyAdvertisementStatus.PUBLISHED,
          PropertyAdvertisementStatus.PAUSED,
          PropertyAdvertisementStatus.ENDED,
        ].includes(advertisement.status)
      ) {
        throw new BadRequestException(
          'An advertisement must have a current approval before it can be published.',
        );
      }
      property = await this.propertyModel
        .findById(advertisement.propertyId)
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
        String(property.agentId) !== String(advertisement.agentId)
      ) {
        throw new BadRequestException(
          'The property must be active, available, and owned by the advertisement agent before publishing.',
        );
      }
    }
    const wasPublished =
      advertisement.status === PropertyAdvertisementStatus.PUBLISHED;
    advertisement.status = status as PropertyAdvertisementStatus;
    if (status === PropertyAdvertisementStatus.PAUSED) advertisement.pausedAt = new Date();
    if (status === PropertyAdvertisementStatus.ENDED) advertisement.endedAt = new Date();
    if (status === PropertyAdvertisementStatus.PUBLISHED) {
      advertisement.publishedAt = new Date();
      advertisement.pausedAt = undefined;
      advertisement.endedAt = undefined;
    }
    if (
      status === PropertyAdvertisementStatus.PAUSED ||
      status === PropertyAdvertisementStatus.ENDED
    ) {
      await this.revokeActiveLocationShares(
        advertisement.propertyId,
        new Date(),
      );
    }
    await advertisement.save();
    if (status === PropertyAdvertisementStatus.PUBLISHED && property) {
      try {
        const propertyUpdate = await this.propertyModel.updateOne(
          {
            _id: property._id,
            agentId: advertisement.agentId,
            inventoryStatus: 'available',
            agentArchived: { $ne: true },
            adminHidden: { $ne: true },
            adminRemoved: { $ne: true },
          },
          { $set: { status: PropertyStatus.PUBLISHED } },
        ).exec();
        if (
          propertyUpdate.matchedCount === 0 ||
          (propertyUpdate.matchedCount === undefined &&
            propertyUpdate.modifiedCount === 0)
        ) {
          throw new BadRequestException(
            'The property is no longer eligible for advertisement publishing.',
          );
        }
      } catch (error) {
        advertisement.status = previousAdvertisementState.status;
        advertisement.publishedAt = previousAdvertisementState.publishedAt;
        advertisement.pausedAt = previousAdvertisementState.pausedAt;
        advertisement.endedAt = previousAdvertisementState.endedAt;
        try {
          await advertisement.save();
        } catch (compensationError) {
          throw new AggregateError(
            [error, compensationError],
            'Property publishing and advertisement compensation both failed.',
          );
        }
        throw error;
      }
    }
    if (
      status === PropertyAdvertisementStatus.PUBLISHED &&
      !wasPublished &&
      advertisement.status === PropertyAdvertisementStatus.PUBLISHED
    ) {
      await this.notifyBuyerSearches(
        String(advertisement.propertyId),
        BuyerNotificationType.PROPERTY_PUBLISHED,
        (advertisement as PropertyAdvertisementDocument & { updatedAt?: Date })
          .updatedAt ?? new Date(),
        'A property matching your saved search is now available.',
      );
    }
    return advertisement;
  }

  async updateInventoryStatus(
    propertyId: string,
    status: 'available' | 'sold' | 'rented' | 'reserved' | 'unavailable',
    requester: { id: string; role: string },
  ) {
    const property = await this.findByIdForManager(propertyId, requester);
    const matchingPropertyStatus = {
      available: PropertyStatus.AVAILABLE,
      sold: PropertyStatus.SOLD,
      rented: PropertyStatus.RENTED,
      reserved: PropertyStatus.RESERVED,
      unavailable: PropertyStatus.UNAVAILABLE,
    }[status];
    const wasPublicAndAvailable =
      property.status === PropertyStatus.PUBLISHED &&
      property.inventoryStatus === 'available';
    const propertyAgentId =
      (property.agentId as unknown as { _id?: Types.ObjectId })?._id ??
      property.agentId;
    const activeAdvertisementBeforeChange =
      status !== 'available' &&
      wasPublicAndAvailable &&
      this.advertisementModel
        ? await this.advertisementModel
            .findOne({
              propertyId: property._id,
              agentId: propertyAgentId,
              status: PropertyAdvertisementStatus.PUBLISHED,
            })
            .select('_id')
            .exec()
        : null;

    if (status !== 'available') {
      await this.revokeActiveLocationShares(property._id, new Date());
    }

    if (status === 'available' && this.advertisementModel) {
      const advertisement = await this.advertisementModel
        .findOne({ propertyId: property._id })
        .exec();
      const propertyAgentId =
        (property.agentId as unknown as { _id?: Types.ObjectId })?._id ??
        property.agentId;
      const currentlyApprovedAndPublishable =
        advertisement?.status === PropertyAdvertisementStatus.PUBLISHED &&
        Boolean(advertisement.approvedAt) &&
        String(advertisement.agentId) === String(propertyAgentId) &&
        !property.agentArchived &&
        !property.adminHidden &&
        !property.adminRemoved;
      const publicationStatus = currentlyApprovedAndPublishable
        ? PropertyStatus.PUBLISHED
        : advertisement?.status === PropertyAdvertisementStatus.PENDING_REVIEW
          ? PropertyStatus.PENDING_APPROVAL
          : advertisement?.status === PropertyAdvertisementStatus.REJECTED
            ? PropertyStatus.REJECTED
            : PropertyStatus.AVAILABLE;
      await this.propertyModel.updateOne(
        { _id: property._id },
        { $set: { inventoryStatus: status, status: publicationStatus } },
      ).exec();
      if (
        property.inventoryStatus !== 'available' &&
        publicationStatus === PropertyStatus.PUBLISHED
      ) {
        await this.notifyBuyerSearches(
          String(property._id),
          BuyerNotificationType.AVAILABILITY_CHANGED,
          new Date(),
          'A matching property is available again.',
        );
      }
      return { inventoryStatus: status, status: publicationStatus };
    }

    await this.propertyModel.updateOne(
      { _id: property._id },
      { $set: { inventoryStatus: status, status: matchingPropertyStatus } },
    ).exec();
    if (this.advertisementModel) {
      await this.advertisementModel.updateOne(
        {
          propertyId: property._id,
          status: {
            $in: [
              PropertyAdvertisementStatus.PENDING_REVIEW,
              PropertyAdvertisementStatus.PUBLISHED,
              PropertyAdvertisementStatus.PAUSED,
            ],
          },
        },
        { $set: { status: PropertyAdvertisementStatus.ENDED, endedAt: new Date() } },
      ).exec();
    }
    if (activeAdvertisementBeforeChange) {
      await this.notifyBuyerSearches(
        String(property._id),
        BuyerNotificationType.AVAILABILITY_CHANGED,
        new Date(),
        `A matching property's availability changed to ${status}.`,
        true,
      );
    }
    return { inventoryStatus: status, status: matchingPropertyStatus };
  }

  async syncAdvertisementModeration(
    propertyId: string,
    status: PropertyStatus,
    notes: string | null,
    adminId: string,
    moderatedAt: Date,
  ) {
    if (!this.advertisementModel) return;
    const property = await this.propertyModel.findById(propertyId).select('agentId').exec();
    if (!property) return;
    if (status !== PropertyStatus.PUBLISHED) {
      await this.revokeActiveLocationShares(property._id, moderatedAt);
    }
    const propertyWithDates = property as PropertyDocument & { createdAt?: Date };
    await this.advertisementModel.updateOne(
      { propertyId: property._id },
      {
        $set: {
          agentId: property.agentId,
          status: status === PropertyStatus.PUBLISHED
            ? PropertyAdvertisementStatus.PUBLISHED
            : PropertyAdvertisementStatus.REJECTED,
          moderationNotes: notes,
          moderatedBy: new Types.ObjectId(adminId),
          ...(status === PropertyStatus.PUBLISHED
            ? { approvedAt: moderatedAt, publishedAt: moderatedAt }
            : {}),
        },
        ...(status === PropertyStatus.PUBLISHED
          ? { $unset: { pausedAt: 1, endedAt: 1 } }
          : { $unset: { approvedAt: 1, publishedAt: 1 } }),
        $setOnInsert: {
          propertyId: property._id,
          submittedAt: propertyWithDates.createdAt ?? moderatedAt,
        },
      },
      { upsert: true, runValidators: true },
    ).exec();
    if (status === PropertyStatus.PUBLISHED) {
      await this.notifyBuyerSearches(
        String(property._id),
        BuyerNotificationType.PROPERTY_PUBLISHED,
        moderatedAt,
        'A property matching your saved search is now available.',
      );
    }
  }

  private async revokeActiveLocationShares(
    propertyId: Types.ObjectId,
    revokedAt: Date,
  ) {
    await this.locationShareModel.updateMany(
      {
        propertyId,
        revokedAt: null,
        expiresAt: { $gt: revokedAt },
      },
      { $set: { revokedAt } },
    ).exec();
  }

  /**
   * Owner/admin lookup for any status. Does not increment views.
   */
  async findByIdForManager(
    id: string,
    requester: { id: string; role: string },
  ): Promise<PropertyDocument> {
    const property = await this.propertyModel
      .findById(id)
      .select('+moderationNotes')
      .populate('agentId', 'name phone agencyName avatarUrl isVerified city')
      .exec();

    if (!property) {
      throw new NotFoundException(`Property with ID '${id}' not found`);
    }

    const populated = property.agentId as unknown as { _id?: Types.ObjectId } | Types.ObjectId;
    const ownerId = String(
      (populated as { _id?: Types.ObjectId })?._id ?? populated,
    );
    if (requester.role !== UserRole.ADMIN && ownerId !== String(requester.id)) {
      // 404 (not 403) so non-owners cannot probe for unpublished listing ids
      throw new NotFoundException(`Property with ID '${id}' not found`);
    }

    return property;
  }

  async findByAgent(agentId: string): Promise<PropertyDocument[]> {
    const properties = await this.propertyModel
      .find({ agentId: new Types.ObjectId(agentId) })
      .select('+moderationNotes')
      .sort({ createdAt: -1 })
      .exec();
    if (!this.advertisementModel || properties.length === 0) return properties;
    const advertisements = await this.advertisementModel
      .find({ propertyId: { $in: properties.map((property) => property._id) } })
      .select('propertyId status moderationNotes')
      .exec();
    const adsByProperty = new Map(
      advertisements.map((ad) => [String(ad.propertyId), ad]),
    );
    return properties.map((property) => {
      const advertisement = adsByProperty.get(String(property._id));
      return Object.assign(property.toObject(), {
        advertisementStatus: advertisement?.status ?? null,
        advertisementId: advertisement ? String(advertisement._id) : null,
        advertisementNotes: advertisement?.moderationNotes ?? null,
      }) as PropertyDocument;
    });
  }

  async updateStatus(
    id: string,
    status: PropertyStatus,
    moderation?: { notes?: string; moderatedBy: string },
  ): Promise<PropertyDocument> {
    const update: Record<string, any> = { status };
    if (moderation) {
      update.moderationNotes = moderation.notes ?? null;
      update.moderatedBy = new Types.ObjectId(moderation.moderatedBy);
      update.moderatedAt = new Date();
    }

    const property = await this.propertyModel
      .findByIdAndUpdate(id, update, { new: true })
      .select('+moderationNotes +moderatedBy')
      .exec();
    if (!property) {
      throw new NotFoundException(`Property with ID '${id}' not found`);
    }
    if (status === PropertyStatus.PUBLISHED) {
      await this.notifyBuyerSearches(
        String(property._id),
        BuyerNotificationType.PROPERTY_PUBLISHED,
        (property as PropertyDocument & { updatedAt?: Date }).updatedAt ?? new Date(),
        'A property matching your saved search is now available.',
      );
    }
    return property;
  }

  private async createBuyerSearchNotifications(
    propertyId: string,
    type: BuyerNotificationType,
    eventAt: Date,
    message: string,
    allowUnavailable = false,
  ) {
    if (
      !this.savedSearchModel ||
      !this.buyerNotificationModel ||
      !this.buyerProfileModel ||
      !this.advertisementModel
    ) {
      return;
    }

    const property = await this.propertyModel
      .findOne({
        _id: propertyId,
        ...(allowUnavailable
          ? {}
          : {
              status: PropertyStatus.PUBLISHED,
              inventoryStatus: 'available',
            }),
        adminHidden: { $ne: true },
        adminRemoved: { $ne: true },
        agentArchived: { $ne: true },
      })
      .select('_id agentId title price purpose propertyType areaSize areaUnit location.city location.area features.bedrooms')
      .lean()
      .exec();
    if (!property) return;
    const ad = await this.advertisementModel
      .findOne({
        propertyId: property._id,
        agentId: property.agentId,
        status: allowUnavailable
          ? {
              $in: [
                PropertyAdvertisementStatus.PUBLISHED,
                PropertyAdvertisementStatus.ENDED,
              ],
            }
          : PropertyAdvertisementStatus.PUBLISHED,
      })
      .select('_id')
      .lean()
      .exec();
    if (!ad) return;

    const searches = await this.savedSearchModel
      .find({
        frequency: SavedSearchFrequency.INSTANT,
        alertsEnabled: true,
      })
      .exec();
    if (!searches.length) return;
    const matchedSearches = [];
    for (const search of searches) {
      const filter = buildPropertySearchFilter(search.filters ?? {});
      if (allowUnavailable) {
        delete filter.status;
        delete filter.inventoryStatus;
      }
      const match = await this.propertyModel
        .exists({
          _id: property._id,
          ...filter,
        })
        .exec();
      if (match) matchedSearches.push(search);
    }
    if (!matchedSearches.length) return;

    const buyerIds = [...new Set(matchedSearches.map((search) => String(search.buyerId)))];
    const profiles = await this.buyerProfileModel
      .find({ buyerId: { $in: buyerIds.map((id) => new Types.ObjectId(id)) } })
      .select('buyerId preferences.notifications.inApp')
      .lean()
      .exec();
    const inAppEnabled = new Set(
      profiles
        .filter((profile) => profile.preferences?.notifications?.inApp !== false)
        .map((profile) => String(profile.buyerId)),
    );
    const profileIds = new Set(profiles.map((profile) => String(profile.buyerId)));
    for (const id of buyerIds) {
      if (!profileIds.has(id)) inAppEnabled.add(id);
    }
    const version = eventAt.toISOString();
    for (const search of matchedSearches) {
      const buyerId = String(search.buyerId);
      if (!inAppEnabled.has(buyerId)) continue;
      try {
        await this.buyerNotificationModel.create({
          buyerId: search.buyerId,
          type,
          title:
            type === BuyerNotificationType.PRICE_CHANGED
              ? 'Saved listing price changed'
              : type === BuyerNotificationType.AVAILABILITY_CHANGED
                ? 'Saved listing availability changed'
                : 'New property match',
          message,
          propertyId: property._id,
          savedSearchId: search._id,
          dedupeKey: `saved-search:${String(search._id)}:${type}:${version}`,
          occurredAt: eventAt,
        });
        search.lastAlertAt = eventAt;
        await search.save();
      } catch (error) {
        if (!this.isDuplicateKey(error)) throw error;
      }
    }
  }

  private async notifyBuyerSearches(
    propertyId: string,
    type: BuyerNotificationType,
    eventAt: Date,
    message: string,
    allowUnavailable = false,
  ) {
    try {
      await this.createBuyerSearchNotifications(
        propertyId,
        type,
        eventAt,
        message,
        allowUnavailable,
      );
    } catch (error) {
      this.logger.warn(
        `Could not persist buyer notifications for property '${propertyId}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
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

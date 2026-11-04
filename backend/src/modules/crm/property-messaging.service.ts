import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes, createHmac } from 'crypto';
import { Model, Types } from 'mongoose';
import { AuthRateLimitService } from '../auth/auth-rate-limit.service';
import { Lead, LeadDocument, LeadSource, LeadStatus } from './schemas/lead.schema';
import {
  PropertyConversation,
  PropertyConversationDocument,
  PropertyConversationStatus,
} from './schemas/property-conversation.schema';
import {
  PropertyMessage,
  PropertyMessageDocument,
  PropertyMessageSenderType,
} from './schemas/property-message.schema';
import {
  Property,
  PropertyDocument,
  PropertyStatus,
} from '../properties/schemas/property.schema';
import {
  PropertyAdvertisement,
  PropertyAdvertisementDocument,
  PropertyAdvertisementStatus,
} from '../properties/schemas/property-advertisement.schema';
import { StartConversationDto } from './dto/start-conversation.dto';
import { SendPropertyMessageDto } from './dto/send-property-message.dto';
import { UserRole } from '../users/schemas/user.schema';
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
  VisitorChatSession,
  VisitorChatSessionDocument,
} from './schemas/visitor-chat-session.schema';

const PROPERTY_CONTEXT_FIELDS =
  'title images location.area location.city price purpose propertyType areaSize areaUnit status inventoryStatus';
const PAGE_SIZE_MAX = 50;
const MESSAGE_RATE_LIMIT = 20;
const MESSAGE_RATE_WINDOW_MS = 60_000;
const VISITOR_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface ConversationRequester {
  id: string;
  role: string;
}

interface VisitorSessionContext {
  tokenHash: string;
  propertyId: Types.ObjectId;
}

@Injectable()
export class PropertyMessagingService {
  constructor(
    @InjectModel(PropertyConversation.name)
    private readonly conversationModel: Model<PropertyConversationDocument>,
    @InjectModel(PropertyMessage.name)
    private readonly messageModel: Model<PropertyMessageDocument>,
    @InjectModel(Lead.name)
    private readonly leadModel: Model<LeadDocument>,
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
    @InjectModel(PropertyAdvertisement.name)
    private readonly advertisementModel: Model<PropertyAdvertisementDocument>,
    private readonly configService: ConfigService,
    @InjectModel(VisitorChatSession.name)
    private readonly visitorSessionModel: Model<VisitorChatSessionDocument>,
    private readonly authRateLimitService: AuthRateLimitService,
    @Optional()
    @InjectModel(BuyerNotification.name)
    private readonly buyerNotificationModel?: Model<BuyerNotificationDocument>,
    @Optional()
    @InjectModel(BuyerProfile.name)
    private readonly buyerProfileModel?: Model<BuyerProfileDocument>,
  ) {}

  async createVisitorSession(propertyId: string, sourceAddress = 'unknown') {
    const property = await this.propertyModel
      .findOne({
        _id: propertyId,
        status: PropertyStatus.PUBLISHED,
        adminHidden: { $ne: true },
        adminRemoved: { $ne: true },
        agentArchived: { $ne: true },
      })
      .select('_id agentId')
      .exec();
    if (!property) {
      throw new NotFoundException('Visitor chat is unavailable for this property.');
    }
    this.authRateLimitService.consume(
      'visitor-session',
      sourceAddress,
      undefined,
      propertyId,
    );

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + VISITOR_SESSION_TTL_MS);
    await this.visitorSessionModel.create({
      tokenHash: this.hashVisitorToken(token),
      propertyId: property._id,
      expiresAt,
    });
    return { visitorSessionToken: token, expiresAt };
  }

  async startVisitorConversation(
    propertyId: string,
    sessionToken: string,
    dto: StartConversationDto,
    sourceAddress = 'unknown',
  ) {
    const visitorSession = await this.validateVisitorSession(
      sessionToken,
      propertyId,
    );
    const visitorHash = visitorSession.tokenHash;
    this.authRateLimitService.consume(
      'visitor-conversation',
      sourceAddress,
      visitorHash,
      [propertyId, `${propertyId}:${visitorHash}`],
    );
    const property = await this.propertyModel
      .findOne({
        _id: propertyId,
        status: PropertyStatus.PUBLISHED,
        adminHidden: { $ne: true },
        adminRemoved: { $ne: true },
        agentArchived: { $ne: true },
      })
      .select('_id agentId title status')
      .exec();
    if (!property) {
      throw new NotFoundException('This property is not accepting new conversations.');
    }

    const advertisement = await this.advertisementModel
      .findOne({
        propertyId: property._id,
        status: PropertyAdvertisementStatus.PUBLISHED,
      })
      .select('_id agentId')
      .exec();
    if (!advertisement || String(advertisement.agentId) !== String(property.agentId)) {
      throw new NotFoundException('This property is not accepting new conversations.');
    }

    const identity = {
      visitorName: dto.visitorName.trim(),
      visitorEmail: dto.visitorEmail?.trim().toLowerCase() || undefined,
      visitorPhone: dto.visitorPhone?.trim() || undefined,
    };
    if (identity.visitorName.length < 2) {
      throw new BadRequestException('Enter a name with at least two characters.');
    }

    const existing = await this.conversationModel
      .findOne({ propertyId: property._id, visitorHash })
      .select('+visitorHash')
      .exec();
    if (existing) {
      existing.visitorName = identity.visitorName;
      existing.visitorEmail = identity.visitorEmail ?? existing.visitorEmail;
      existing.visitorPhone = identity.visitorPhone ?? existing.visitorPhone;
      existing.status = PropertyConversationStatus.ACTIVE;
      await existing.save();
      await this.updateChatLead(existing, advertisement._id, identity);
      return this.loadVisitorConversation(String(existing._id), visitorSession);
    }

    const lead = await this.upsertChatLead(
      property,
      advertisement._id,
      visitorHash,
      identity,
    );
    let conversation: PropertyConversationDocument;
    try {
      conversation = await this.conversationModel
        .findOneAndUpdate(
          { propertyId: property._id, visitorHash },
          {
            $setOnInsert: {
              propertyId: property._id,
              advertisementId: advertisement._id,
              agentId: property.agentId,
              leadId: lead._id,
              visitorHash,
              status: PropertyConversationStatus.ACTIVE,
              latestMessagePreview: '',
              lastMessageAt: new Date(),
              unreadForAgent: 0,
              unreadForVisitor: 0,
            },
            $set: identity,
          },
          { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
        )
        .select('+visitorHash')
        .exec();
    } catch (error) {
      if (!this.isDuplicateKey(error)) throw error;
      const racedConversation = await this.conversationModel
        .findOne({ propertyId: property._id, visitorHash })
        .select('+visitorHash')
        .exec();
      if (!racedConversation) throw error;
      conversation = racedConversation;
    }

    await this.leadModel
      .updateOne(
        { _id: lead._id, agentId: property.agentId },
        { $set: { conversationId: conversation._id } },
      )
      .exec();
    return this.loadVisitorConversation(
      String(conversation._id),
      visitorSession,
    );
  }

  async getVisitorConversation(
    conversationId: string,
    sessionToken: string,
    sourceAddress = 'unknown',
  ) {
    const visitorSession = await this.validateVisitorSession(sessionToken);
    this.authRateLimitService.consume(
      'visitor-read',
      sourceAddress,
      visitorSession.tokenHash,
      [String(visitorSession.propertyId), `${visitorSession.propertyId}:${conversationId}`],
    );
    return this.loadVisitorConversation(conversationId, visitorSession);
  }

  async validateVisitorSession(
    sessionToken: string,
    propertyId?: string,
  ): Promise<VisitorSessionContext> {
    if (typeof sessionToken !== 'string' || !/^[0-9a-f]{64}$/i.test(sessionToken)) {
      throw new UnauthorizedException('Visitor chat session is invalid or expired.');
    }

    const filter: Record<string, unknown> = {
      tokenHash: this.hashVisitorToken(sessionToken),
      expiresAt: { $gt: new Date() },
    };
    if (propertyId) filter.propertyId = new Types.ObjectId(propertyId);
    const session = await this.visitorSessionModel
      .findOne(filter)
      .select('+tokenHash')
      .exec();
    if (!session) {
      throw new UnauthorizedException('Visitor chat session is invalid or expired.');
    }
    return {
      tokenHash: session.tokenHash,
      propertyId: session.propertyId,
    };
  }

  hashVisitorSessionToken(sessionToken: string) {
    if (typeof sessionToken !== 'string' || !/^[0-9a-f]{64}$/i.test(sessionToken)) {
      throw new UnauthorizedException('Visitor chat session is invalid or expired.');
    }
    return this.hashVisitorToken(sessionToken);
  }

  async startBuyerConversation(
    propertyId: string,
    buyerId: string,
    identity: Pick<StartConversationDto, 'visitorName' | 'visitorEmail' | 'visitorPhone'>,
  ) {
    const buyerObjectId = new Types.ObjectId(buyerId);
    const property = await this.propertyModel
      .findOne({
        _id: propertyId,
        status: PropertyStatus.PUBLISHED,
        inventoryStatus: 'available',
        adminHidden: { $ne: true },
        adminRemoved: { $ne: true },
        agentArchived: { $ne: true },
      })
      .select('_id agentId title status')
      .exec();
    if (!property) {
      throw new NotFoundException('This property is not accepting new conversations.');
    }

    const advertisement = await this.advertisementModel
      .findOne({
        propertyId: property._id,
        agentId: property.agentId,
        status: PropertyAdvertisementStatus.PUBLISHED,
      })
      .select('_id agentId')
      .exec();
    if (!advertisement) {
      throw new NotFoundException('This property is not accepting new conversations.');
    }
    const normalizedIdentity = {
      visitorName: identity.visitorName.trim(),
      visitorEmail: identity.visitorEmail?.trim().toLowerCase() || undefined,
      visitorPhone: identity.visitorPhone?.trim() || undefined,
    };
    if (normalizedIdentity.visitorName.length < 2) {
      throw new BadRequestException('Enter a name with at least two characters.');
    }
    const visitorHash = this.hashBuyerId(buyerId);
    const existing = await this.conversationModel
      .findOne({
        propertyId: property._id,
        $or: [{ buyerId: buyerObjectId }, { visitorHash }],
      })
      .exec();
    if (existing) {
      existing.buyerId = buyerObjectId;
      existing.visitorName = normalizedIdentity.visitorName;
      existing.visitorEmail = normalizedIdentity.visitorEmail;
      existing.visitorPhone = normalizedIdentity.visitorPhone;
      existing.status = PropertyConversationStatus.ACTIVE;
      await existing.save();
      await this.updateChatLead(
        existing,
        advertisement._id,
        normalizedIdentity,
        buyerObjectId,
      );
      return this.loadBuyerConversation(String(existing._id), buyerId);
    }

    const lead = await this.upsertChatLead(
      property,
      advertisement._id,
      visitorHash,
      normalizedIdentity,
      buyerObjectId,
    );
    let conversation: PropertyConversationDocument;
    try {
      conversation = await this.conversationModel
        .findOneAndUpdate(
          { propertyId: property._id, visitorHash },
          {
            $setOnInsert: {
              propertyId: property._id,
              advertisementId: advertisement._id,
              agentId: property.agentId,
              leadId: lead._id,
              buyerId: buyerObjectId,
              visitorHash,
              status: PropertyConversationStatus.ACTIVE,
              latestMessagePreview: '',
              lastMessageAt: new Date(),
              unreadForAgent: 0,
              unreadForVisitor: 0,
            },
            $set: normalizedIdentity,
          },
          { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
        )
        .exec();
    } catch (error) {
      if (!this.isDuplicateKey(error)) throw error;
      const competingConversation = await this.conversationModel
        .findOne({ propertyId: property._id, visitorHash })
        .exec();
      if (!competingConversation) throw error;
      conversation = competingConversation;
    }
    await this.leadModel
      .updateOne(
        { _id: lead._id, agentId: property.agentId },
        { $set: { conversationId: conversation._id, buyerId: buyerObjectId } },
      )
      .exec();
    return this.loadBuyerConversation(String(conversation._id), buyerId);
  }

  async getBuyerConversations(buyerId: string) {
    const conversations = await this.conversationModel
      .find({ buyerId: new Types.ObjectId(buyerId) })
      .populate('propertyId', PROPERTY_CONTEXT_FIELDS)
      .sort({ lastMessageAt: -1 })
      .limit(200)
      .exec();
    return conversations.map((conversation) =>
      this.serializeBuyerConversation(conversation),
    );
  }

  async getBuyerConversation(conversationId: string, buyerId: string) {
    return this.loadBuyerConversation(conversationId, buyerId);
  }

  getBuyerConversationCount(buyerId: string) {
    return this.conversationModel
      .countDocuments({ buyerId: new Types.ObjectId(buyerId) })
      .exec();
  }

  getBuyerUnreadCount(buyerId: string) {
    return this.conversationModel
      .aggregate([
        {
          $match: {
            buyerId: new Types.ObjectId(buyerId),
            status: PropertyConversationStatus.ACTIVE,
          },
        },
        { $group: { _id: null, total: { $sum: '$unreadForVisitor' } } },
      ])
      .exec()
      .then((result) => result[0]?.total ?? 0);
  }

  getBuyerMessages(
    conversationId: string,
    buyerId: string,
    before?: string,
    limit?: string,
  ) {
    return this.getMessages(
      conversationId,
      { id: buyerId, role: UserRole.BUYER },
      undefined,
      before,
      limit,
    );
  }

  sendBuyerMessage(
    conversationId: string,
    buyerId: string,
    dto: SendPropertyMessageDto,
  ) {
    return this.sendMessage(
      conversationId,
      PropertyMessageSenderType.BUYER,
      new Types.ObjectId(buyerId),
      dto,
      undefined,
      undefined,
      buyerId,
    );
  }

  private async loadVisitorConversation(
    conversationId: string,
    visitorSession: VisitorSessionContext,
  ) {
    const conversation = await this.conversationModel
      .findOne({
        _id: conversationId,
        visitorHash: visitorSession.tokenHash,
        propertyId: visitorSession.propertyId,
      })
      .populate('propertyId', PROPERTY_CONTEXT_FIELDS)
      .populate('agentId', 'name agencyName city avatarUrl isVerified')
      .exec();
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }
    return this.serializeConversation(conversation, true);
  }

  private async loadBuyerConversation(conversationId: string, buyerId: string) {
    const conversation = await this.conversationModel
      .findOne({
        _id: conversationId,
        buyerId: new Types.ObjectId(buyerId),
      })
      .populate('propertyId', PROPERTY_CONTEXT_FIELDS)
      .exec();
    if (!conversation) throw new NotFoundException('Conversation not found.');
    return this.serializeBuyerConversation(conversation);
  }

  private serializeBuyerConversation(conversation: PropertyConversationDocument) {
    const property = conversation.propertyId as unknown as
      | Record<string, any>
      | Types.ObjectId;
    const populated = typeof property === 'object' && 'title' in property;
    const result: Record<string, unknown> = {
      id: String(conversation._id),
      propertyId: String(populated ? property._id : property),
      status: conversation.status,
      latestMessagePreview: conversation.latestMessagePreview,
      latestMessageSender: conversation.latestMessageSender ?? null,
      lastMessageAt: conversation.lastMessageAt,
      unreadMessages: conversation.unreadForVisitor,
      createdAt: (conversation as PropertyConversationDocument & { createdAt?: Date })
        .createdAt,
    };
    if (populated) {
      result.property = {
        id: String(property._id),
        title: property.title,
        images: property.images ?? [],
        location: property.location,
        price: property.price,
        purpose: property.purpose,
        propertyType: property.propertyType,
        areaSize: property.areaSize,
        areaUnit: property.areaUnit,
        availability: property.inventoryStatus ?? property.status ?? 'available',
      };
    }
    return result;
  }

  async getAgentConversations(agentId: string, query = '') {
    const filter: Record<string, unknown> = {
      agentId: new Types.ObjectId(agentId),
      status: PropertyConversationStatus.ACTIVE,
    };
    const normalizedQuery = query.trim().slice(0, 100);
    if (normalizedQuery) {
      const escaped = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      const matchingProperties = await this.propertyModel
        .find({
          agentId: new Types.ObjectId(agentId),
          $or: [
            { title: regex },
            { 'location.area': regex },
            { 'location.city': regex },
          ],
        })
        .select('_id')
        .limit(100)
        .exec();
      filter.$or = [
        { visitorName: regex },
        { propertyId: { $in: matchingProperties.map((property) => property._id) } },
      ];
    }
    const conversations = await this.conversationModel
      .find(filter)
      .select('+visitorHash')
      .populate('propertyId', PROPERTY_CONTEXT_FIELDS)
      .sort({ lastMessageAt: -1 })
      .limit(200)
      .exec();
    return conversations.map((conversation) =>
      this.serializeConversation(conversation, false),
    );
  }

  async getAgentUnreadCount(agentId: string) {
    return this.conversationModel
      .countDocuments({
        agentId: new Types.ObjectId(agentId),
        status: PropertyConversationStatus.ACTIVE,
        unreadForAgent: { $gt: 0 },
      })
      .exec();
  }

  async getAgentConversation(
    conversationId: string,
    requester: ConversationRequester,
  ) {
    this.assertAgent(requester);
    const conversation = await this.conversationModel
      .findOne({
        _id: conversationId,
        agentId: new Types.ObjectId(requester.id),
      })
      .populate('propertyId', PROPERTY_CONTEXT_FIELDS)
      .exec();
    if (!conversation) throw new NotFoundException('Conversation not found.');
    return this.serializeConversation(conversation, false);
  }

  async getMessages(
    conversationId: string,
    requester: ConversationRequester,
    visitorSession?: VisitorSessionContext,
    before?: string,
    requestedLimit?: string,
    sourceAddress = 'unknown',
  ) {
    const conversation = await this.getConversationForRequester(
      conversationId,
      requester,
      visitorSession,
    );
    if (visitorSession) {
      this.authRateLimitService.consume(
        'visitor-read',
        sourceAddress,
        visitorSession.tokenHash,
        [
          String(visitorSession.propertyId),
          `${visitorSession.propertyId}:${conversationId}`,
        ],
      );
    }
    const limit = this.parsePageSize(requestedLimit);
    const [beforeTimestamp, beforeId] = before?.split('|') ?? [];
    const beforeDate = beforeTimestamp ? new Date(beforeTimestamp) : undefined;
    if (
      before &&
      (!beforeDate ||
        Number.isNaN(beforeDate.getTime()) ||
        (beforeId !== undefined && !Types.ObjectId.isValid(beforeId)))
    ) {
      throw new BadRequestException('Invalid message page cursor.');
    }
    const filter: Record<string, unknown> = {
      conversationId: conversation._id,
    };
    if (beforeDate) {
      filter.$or = beforeId
        ? [
            { createdAt: { $lt: beforeDate } },
            { createdAt: beforeDate, _id: { $lt: new Types.ObjectId(beforeId) } },
          ]
        : [{ createdAt: { $lt: beforeDate } }];
    }
    const messages = await this.messageModel
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .exec();
    const hasMore = messages.length > limit;
    const page = messages.slice(0, limit).reverse();
    const readerType =
      requester.role === UserRole.AGENT
        ? PropertyMessageSenderType.AGENT
        : requester.role === UserRole.BUYER
          ? PropertyMessageSenderType.BUYER
          : null;
    const updateFilter: Record<string, unknown> = {
      conversationId: conversation._id,
      readAt: null,
    };
    if (visitorSession) {
      updateFilter.senderType = PropertyMessageSenderType.AGENT;
      await this.conversationModel
        .updateOne(
          {
            _id: conversation._id,
            visitorHash: visitorSession.tokenHash,
            propertyId: visitorSession.propertyId,
          },
          { $set: { unreadForVisitor: 0 } },
        )
        .exec();
    } else if (readerType === PropertyMessageSenderType.AGENT) {
      updateFilter.senderType = {
        $in: [PropertyMessageSenderType.VISITOR, PropertyMessageSenderType.BUYER],
      };
      await this.conversationModel
        .updateOne(
          { _id: conversation._id, agentId: new Types.ObjectId(requester.id) },
          { $set: { unreadForAgent: 0 } },
        )
        .exec();
    } else if (readerType === PropertyMessageSenderType.BUYER) {
      updateFilter.senderType = PropertyMessageSenderType.AGENT;
      await this.conversationModel
        .updateOne(
          { _id: conversation._id, buyerId: new Types.ObjectId(requester.id) },
          { $set: { unreadForVisitor: 0 } },
        )
        .exec();
    }
    if (visitorSession || readerType) {
      await this.messageModel
        .updateMany(updateFilter, { $set: { readAt: new Date() } })
        .exec();
    }
    return {
      messages: page.map((message) => this.serializeMessage(message)),
      hasMore,
      nextBefore: hasMore
        ? (() => {
            const oldest = page[0] as
              | (PropertyMessageDocument & { createdAt?: Date })
              | undefined;
            return oldest?.createdAt
              ? `${oldest.createdAt.toISOString()}|${String(oldest._id)}`
              : null;
          })()
        : null,
    };
  }

  async sendAgentMessage(
    conversationId: string,
    requester: ConversationRequester,
    dto: SendPropertyMessageDto,
  ) {
    this.assertAgent(requester);
    return this.sendMessage(
      conversationId,
      PropertyMessageSenderType.AGENT,
      new Types.ObjectId(requester.id),
      dto,
      undefined,
      requester.id,
    );
  }

  async sendVisitorMessage(
    conversationId: string,
    sessionToken: string,
    dto: SendPropertyMessageDto,
    sourceAddress = 'unknown',
  ) {
    const visitorSession = await this.validateVisitorSession(sessionToken);
    return this.sendMessage(
      conversationId,
      PropertyMessageSenderType.VISITOR,
      undefined,
      dto,
      visitorSession,
      undefined,
      undefined,
      sourceAddress,
    );
  }

  private async sendMessage(
    conversationId: string,
    senderType: PropertyMessageSenderType,
    senderId: Types.ObjectId | undefined,
    dto: SendPropertyMessageDto,
    visitorSession?: VisitorSessionContext,
    agentId?: string,
    buyerId?: string,
    sourceAddress?: string,
  ) {
    const conversation = await this.getConversationForRequester(
      conversationId,
      buyerId
        ? { id: buyerId, role: UserRole.BUYER }
        : agentId
          ? { id: agentId, role: UserRole.AGENT }
          : { id: '', role: 'visitor' },
      visitorSession,
    );
    const content = dto.content.trim();
    if (!content) throw new BadRequestException('Message cannot be empty.');
    if (senderType === PropertyMessageSenderType.VISITOR && visitorSession) {
      this.authRateLimitService.consume(
        'visitor-message',
        sourceAddress ?? 'unknown',
        visitorSession.tokenHash,
        [
          String(visitorSession.propertyId),
          `${visitorSession.propertyId}:${conversation._id}`,
        ],
      );
    }

    const priorMessage = await this.messageModel
      .findOne({ conversationId: conversation._id, idempotencyKey: dto.idempotencyKey })
      .exec();
    if (priorMessage) {
      if (
        senderType === PropertyMessageSenderType.AGENT &&
        conversation.buyerId &&
        this.buyerNotificationModel
      ) {
        await this.createBuyerMessageNotification(conversation, priorMessage);
      }
      return this.serializeMessage(priorMessage);
    }

    const recentMessageCount = await this.messageModel
      .countDocuments({
        conversationId: conversation._id,
        senderType,
        createdAt: { $gte: new Date(Date.now() - MESSAGE_RATE_WINDOW_MS) },
      })
      .exec();
    if (recentMessageCount >= MESSAGE_RATE_LIMIT) {
      throw new HttpException(
        'Please wait before sending more messages.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let message: PropertyMessageDocument;
    try {
      message = await this.messageModel.create({
        conversationId: conversation._id,
        senderType,
        senderId: senderId ?? null,
        content,
        idempotencyKey: dto.idempotencyKey,
        readAt: null,
      });
    } catch (error) {
      if (!this.isDuplicateKey(error)) throw error;
      const duplicate = await this.messageModel
        .findOne({
          conversationId: conversation._id,
          idempotencyKey: dto.idempotencyKey,
        })
        .exec();
      if (!duplicate) throw error;
      if (
        senderType === PropertyMessageSenderType.AGENT &&
        conversation.buyerId &&
        this.buyerNotificationModel
      ) {
        await this.createBuyerMessageNotification(conversation, duplicate);
      }
      return this.serializeMessage(duplicate);
    }

    const update =
      senderType !== PropertyMessageSenderType.AGENT
        ? {
            $set: {
              latestMessagePreview: content.slice(0, 180),
              latestMessageSender: senderType,
              lastMessageAt:
                (message as PropertyMessageDocument & { createdAt?: Date }).createdAt ??
                new Date(),
            },
            $inc: { unreadForAgent: 1 },
          }
        : {
            $set: {
              latestMessagePreview: content.slice(0, 180),
              latestMessageSender: senderType,
              lastMessageAt:
                (message as PropertyMessageDocument & { createdAt?: Date }).createdAt ??
                new Date(),
            },
            $inc: { unreadForVisitor: 1 },
          };
    await this.conversationModel
      .updateOne({ _id: conversation._id }, update)
      .exec();
    if (
      senderType === PropertyMessageSenderType.AGENT &&
      conversation.buyerId &&
      this.buyerNotificationModel
    ) {
      await this.createBuyerMessageNotification(conversation, message);
    }
    return this.serializeMessage(message);
  }

  private async createBuyerMessageNotification(
    conversation: PropertyConversationDocument,
    message: PropertyMessageDocument,
  ) {
    const buyerId = conversation.buyerId;
    if (!buyerId || !this.buyerNotificationModel) return;
    const profile = await this.buyerProfileModel
      ?.findOne({ buyerId })
      .select('preferences.notifications.inApp')
      .lean()
      .exec();
    if (profile?.preferences?.notifications?.inApp === false) return;
    try {
      await this.buyerNotificationModel.create({
        buyerId,
        type: BuyerNotificationType.CONVERSATION_MESSAGE,
        title: 'New message from the agent',
        message: message.content.slice(0, 500),
        propertyId: conversation.propertyId,
        conversationId: conversation._id,
        dedupeKey: `conversation:${String(conversation._id)}:message:${String(message._id)}`,
        occurredAt:
          (message as PropertyMessageDocument & { createdAt?: Date }).createdAt ??
          new Date(),
      });
    } catch (error) {
      if (!this.isDuplicateKey(error)) throw error;
    }
  }

  private async getConversationForRequester(
    conversationId: string,
    requester: ConversationRequester,
    visitorSession?: VisitorSessionContext,
  ) {
    if (visitorSession) {
      const conversation = await this.conversationModel
        .findOne({
          _id: conversationId,
          visitorHash: visitorSession.tokenHash,
          propertyId: visitorSession.propertyId,
        })
        .exec();
      if (!conversation) throw new NotFoundException('Conversation not found.');
      return conversation;
    }
    if (requester.role === UserRole.BUYER) {
      const conversation = await this.conversationModel
        .findOne({
          _id: conversationId,
          buyerId: new Types.ObjectId(requester.id),
        })
        .exec();
      if (!conversation) throw new NotFoundException('Conversation not found.');
      return conversation;
    }
    this.assertAgent(requester);
    const conversation = await this.conversationModel
      .findOne({
        _id: conversationId,
        agentId: new Types.ObjectId(requester.id),
      })
      .select('+buyerId')
      .exec();
    if (!conversation) throw new NotFoundException('Conversation not found.');
    return conversation;
  }

  private async upsertChatLead(
    property: PropertyDocument,
    advertisementId: Types.ObjectId,
    visitorHash: string,
    identity: Pick<StartConversationDto, 'visitorName' | 'visitorEmail' | 'visitorPhone'>,
    buyerId?: Types.ObjectId,
  ) {
    try {
      const lead = await this.leadModel
        .findOneAndUpdate(
          {
            agentId: property.agentId,
            propertyId: property._id,
            visitorHash,
          },
          {
            $set: {
              clientName: identity.visitorName,
              clientEmail: identity.visitorEmail ?? null,
              clientPhone: identity.visitorPhone ?? '',
              advertisementId,
              source: LeadSource.WEBSITE_CHAT,
              ...(buyerId ? { buyerId } : {}),
            },
            $setOnInsert: {
              agentId: property.agentId,
              propertyId: property._id,
              propertyTitle: property.title,
              visitorHash,
              status: LeadStatus.NEW,
              notes: 'Started a conversation from the public property page.',
            },
          },
          { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
        )
        .select('+visitorHash')
        .exec();
      if (!lead) throw new Error('Unable to create the conversation lead.');
      return lead;
    } catch (error) {
      if (!this.isDuplicateKey(error)) throw error;
      const existing = await this.leadModel
        .findOne({ agentId: property.agentId, propertyId: property._id, visitorHash })
        .select('+visitorHash')
        .exec();
      if (!existing) throw error;
      return existing;
    }
  }

  private async updateChatLead(
    conversation: PropertyConversationDocument,
    advertisementId: Types.ObjectId,
    identity: Pick<StartConversationDto, 'visitorName' | 'visitorEmail' | 'visitorPhone'>,
    buyerId?: Types.ObjectId,
  ) {
    await this.leadModel
      .updateOne(
        {
          _id: conversation.leadId,
          agentId: conversation.agentId,
          propertyId: conversation.propertyId,
        },
        {
          $set: {
            clientName: identity.visitorName,
            ...(identity.visitorEmail ? { clientEmail: identity.visitorEmail } : {}),
            ...(identity.visitorPhone ? { clientPhone: identity.visitorPhone } : {}),
            advertisementId,
            conversationId: conversation._id,
            ...(buyerId ? { buyerId } : {}),
          },
        },
      )
      .exec();
  }

  private serializeConversation(
    conversation: PropertyConversationDocument,
    includeAgent: boolean,
  ) {
    const property = conversation.propertyId as unknown as
      | Record<string, unknown>
      | Types.ObjectId;
    const isPopulatedProperty =
      typeof property === 'object' && property !== null && 'title' in property;
    const agent = conversation.agentId as unknown as
      | Record<string, unknown>
      | Types.ObjectId;
    const isPopulatedAgent =
      typeof agent === 'object' && agent !== null && 'name' in agent;
    const result: Record<string, unknown> = {
      id: String(conversation._id),
      propertyId: String(
        isPopulatedProperty ? (property as { _id: Types.ObjectId })._id : property,
      ),
      advertisementId: String(conversation.advertisementId),
      leadId: String(conversation.leadId),
      visitorName: conversation.visitorName,
      status: conversation.status,
      latestMessagePreview: conversation.latestMessagePreview,
      latestMessageSender: conversation.latestMessageSender ?? null,
      lastMessageAt: conversation.lastMessageAt,
      unreadForAgent: conversation.unreadForAgent,
      unreadForVisitor: conversation.unreadForVisitor,
      createdAt: (conversation as PropertyConversationDocument & { createdAt?: Date })
        .createdAt,
    };
    if (isPopulatedProperty) {
      const currentProperty = property as Record<string, unknown> & {
        location?: { area?: string; city?: string };
      };
      result.property = {
        id: String(currentProperty._id),
        title: currentProperty.title,
        images: currentProperty.images ?? [],
        location: currentProperty.location,
        price: currentProperty.price,
        purpose: currentProperty.purpose,
        propertyType: currentProperty.propertyType,
        areaSize: currentProperty.areaSize,
        areaUnit: currentProperty.areaUnit,
        availability:
          currentProperty.inventoryStatus ??
          currentProperty.status ??
          'available',
      };
    }
    if (includeAgent && isPopulatedAgent) {
      const currentAgent = agent as Record<string, unknown>;
      result.agent = {
        name: currentAgent.name,
        agencyName: currentAgent.agencyName,
        city: currentAgent.city,
        avatarUrl: currentAgent.avatarUrl,
        isVerified: currentAgent.isVerified,
      };
    }
    return result;
  }

  private serializeMessage(message: PropertyMessageDocument) {
    return {
      id: String(message._id),
      conversationId: String(message.conversationId),
      senderType: message.senderType,
      content: message.content,
      createdAt: (message as PropertyMessageDocument & { createdAt?: Date }).createdAt,
      readAt: message.readAt ?? null,
      deliveryStatus: 'sent',
    };
  }

  private parsePageSize(value?: string) {
    if (value === undefined) return 30;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException('Message page size must be a positive integer.');
    }
    return Math.min(parsed, PAGE_SIZE_MAX);
  }

  private hashVisitorToken(token: string) {
    return createHash('sha256')
      .update(token.toLowerCase())
      .digest('hex');
  }

  private hashBuyerId(buyerId: string) {
    const secret = this.configService.get<string>('jwt.secret');
    if (!secret) throw new ForbiddenException('Buyer conversations are unavailable.');
    return createHmac('sha256', secret)
      .update(`estatepro-buyer-chat:${buyerId}`)
      .digest('hex');
  }

  private assertAgent(requester: ConversationRequester) {
    if (requester.role !== UserRole.AGENT) {
      throw new ForbiddenException('Agent access is required.');
    }
  }

  private isDuplicateKey(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    );
  }
}

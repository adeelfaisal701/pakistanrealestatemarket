import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthRateLimitService } from '../src/modules/auth/auth-rate-limit.service';
import { SendPropertyMessageDto } from '../src/modules/crm/dto/send-property-message.dto';
import { PropertyMessagingService } from '../src/modules/crm/property-messaging.service';
import { PropertyConversationStatus } from '../src/modules/crm/schemas/property-conversation.schema';

function query<T>(value: T) {
  const result: Record<string, unknown> = {
    select: () => result,
    populate: () => result,
    sort: () => result,
    limit: () => result,
    exec: async () => value,
  };
  return result;
}

function makeService(overrides: {
  conversationModel?: Record<string, (...args: never[]) => unknown>;
  messageModel?: Record<string, (...args: never[]) => unknown>;
  leadModel?: Record<string, (...args: never[]) => unknown>;
  propertyModel?: Record<string, (...args: never[]) => unknown>;
  advertisementModel?: Record<string, (...args: never[]) => unknown>;
  visitorSessionModel?: Record<string, (...args: never[]) => unknown>;
  authRateLimitService?: AuthRateLimitService;
  jwtSecret?: string;
} = {}) {
  const defaultPropertyId = new Types.ObjectId();
  return new PropertyMessagingService(
    (overrides.conversationModel ?? {}) as never,
    (overrides.messageModel ?? {}) as never,
    (overrides.leadModel ?? {}) as never,
    (overrides.propertyModel ?? {}) as never,
    (overrides.advertisementModel ?? {}) as never,
    new ConfigService({
      jwt: { secret: overrides.jwtSecret ?? 'test-property-chat-secret' },
    }),
    (overrides.visitorSessionModel ?? {
      findOne: (filter: Record<string, unknown>) =>
        query({
          tokenHash: filter.tokenHash,
          propertyId: filter.propertyId ?? defaultPropertyId,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      create: async (session: Record<string, unknown>) => session,
    }) as never,
    overrides.authRateLimitService ?? new AuthRateLimitService(),
  );
}

test('visitor sessions are server-issued, random, property-bound, and stored as one-way hashes', async () => {
  const propertyId = new Types.ObjectId();
  const property = { _id: propertyId, agentId: new Types.ObjectId() };
  const storedSessions: Record<string, unknown>[] = [];
  const service = makeService({
    propertyModel: { findOne: () => query(property) },
    visitorSessionModel: {
      create: async (session: Record<string, unknown>) => {
        storedSessions.push(session);
        return session;
      },
      findOne: (filter: Record<string, unknown>) =>
        query(
          filter.propertyId &&
            String(filter.propertyId) !== String(propertyId)
            ? null
            : storedSessions.find(
                (session) => session.tokenHash === filter.tokenHash,
              ) ?? null,
        ),
    },
  });
  const first = await service.createVisitorSession(String(propertyId), '192.0.2.10');
  const second = await service.createVisitorSession(String(propertyId), '192.0.2.10');

  assert.match(first.visitorSessionToken, /^[0-9a-f]{64}$/);
  assert.notEqual(first.visitorSessionToken, second.visitorSessionToken);
  assert.notEqual(storedSessions[0].tokenHash, first.visitorSessionToken);
  assert.equal(storedSessions[0].propertyId, propertyId);
  assert.ok(storedSessions[0].expiresAt instanceof Date);
  assert.ok((storedSessions[0].expiresAt as Date).getTime() > Date.now());
  assert.deepEqual(
    await service.validateVisitorSession(first.visitorSessionToken, String(propertyId)),
    { tokenHash: storedSessions[0].tokenHash, propertyId },
  );
  const tamperedToken = `${first.visitorSessionToken.slice(0, -1)}${
    first.visitorSessionToken.endsWith('0') ? '1' : '0'
  }`;
  await assert.rejects(
    service.validateVisitorSession(tamperedToken),
    UnauthorizedException,
  );
  await assert.rejects(
    service.validateVisitorSession(
      first.visitorSessionToken,
      String(new Types.ObjectId()),
    ),
    UnauthorizedException,
  );
});

test('unissued, malformed, expired, and tampered visitor tokens are rejected', async () => {
  const sessionFilters: Record<string, unknown>[] = [];
  const expiredToken = 'b'.repeat(64);
  let expiredTokenHash = '';
  const service = makeService({
    visitorSessionModel: {
      findOne: (filter: Record<string, unknown>) => {
        sessionFilters.push(filter);
        const expiredSession =
          filter.tokenHash === expiredTokenHash
            ? {
                tokenHash: filter.tokenHash,
                propertyId: new Types.ObjectId(),
                expiresAt: new Date(Date.now() - 60_000),
              }
            : null;
        const expiresAfter = (filter.expiresAt as { $gt: Date }).$gt;
        return query(
          expiredSession && expiredSession.expiresAt > expiresAfter
            ? expiredSession
            : null,
        );
      },
    },
  });
  expiredTokenHash = service.hashVisitorSessionToken(expiredToken);

  await assert.rejects(
    service.validateVisitorSession('not-a-session'),
    UnauthorizedException,
  );
  await assert.rejects(
    service.validateVisitorSession('a'.repeat(64)),
    UnauthorizedException,
  );
  await assert.rejects(
    service.validateVisitorSession(expiredToken),
    UnauthorizedException,
  );
  assert.equal(sessionFilters.length, 2);
  assert.ok(
    (sessionFilters[1].expiresAt as { $gt?: Date }).$gt instanceof Date,
  );
});

test('visitor session creation is rate-limited per IP and property', async () => {
  const propertyId = new Types.ObjectId();
  const service = makeService({
    propertyModel: { findOne: () => query({ _id: propertyId }) },
  });
  for (let index = 0; index < 10; index += 1) {
    await service.createVisitorSession(String(propertyId), '192.0.2.10');
  }
  await assert.rejects(
    service.createVisitorSession(String(propertyId), '192.0.2.10'),
    (error: unknown) => error instanceof HttpException && error.getStatus() === 429,
  );
  await service.createVisitorSession(String(propertyId), '192.0.2.11');

  const propertyLimitedService = makeService({
    propertyModel: { findOne: () => query({ _id: propertyId }) },
  });
  for (let index = 0; index < 100; index += 1) {
    await propertyLimitedService.createVisitorSession(
      String(propertyId),
      `192.0.2.${index + 1}`,
    );
  }
  await assert.rejects(
    propertyLimitedService.createVisitorSession(
      String(propertyId),
      '198.51.100.1',
    ),
    (error: unknown) => error instanceof HttpException && error.getStatus() === 429,
  );
});

test('message DTO rejects oversized bodies and invalid idempotency keys', async () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });
  const metadata = { type: 'body' as const, metatype: SendPropertyMessageDto };
  await assert.rejects(
    validationPipe.transform(
      { content: 'Valid text', idempotencyKey: 'not-a-uuid' },
      metadata,
    ),
    BadRequestException,
  );
  await assert.rejects(
    validationPipe.transform(
      {
        content: 'x'.repeat(2001),
        idempotencyKey: '7981c8b0-bcc9-43f3-aea3-52f80f088718',
      },
      metadata,
    ),
    BadRequestException,
  );
  await assert.rejects(
    validationPipe.transform(
      {
        content: '   ',
        idempotencyKey: '7981c8b0-bcc9-43f3-aea3-52f80f088718',
      },
      metadata,
    ),
    BadRequestException,
  );
});

test('existing visitor conversation uses the session hash once and updates its lead identity', async () => {
  const rawToken = 'a'.repeat(64);
  const visitorHash = makeService().hashVisitorSessionToken(rawToken);
  const propertyId = new Types.ObjectId();
  const agentId = new Types.ObjectId();
  const advertisementId = new Types.ObjectId();
  const conversationId = new Types.ObjectId();
  const property = {
    _id: propertyId,
    agentId,
    title: 'Published property',
    status: 'published',
  };
  const advertisement = { _id: advertisementId, agentId };
  const conversation = {
    _id: conversationId,
    propertyId: {
      _id: propertyId,
      title: 'Published property',
      images: [],
      location: { area: 'Area', city: 'City' },
      price: 100,
      purpose: 'Sale',
      propertyType: 'House',
      areaSize: 5,
      areaUnit: 'Marla',
      inventoryStatus: 'available',
    },
    agentId: { _id: agentId, name: 'Agent' },
    advertisementId,
    leadId: new Types.ObjectId(),
    visitorName: 'Existing visitor',
    visitorHash,
    status: PropertyConversationStatus.ACTIVE,
    latestMessagePreview: '',
    lastMessageAt: new Date(),
    unreadForAgent: 0,
    unreadForVisitor: 0,
    save: async () => undefined,
  };
  const conversationFilters: Record<string, unknown>[] = [];
  const conversationModel = {
    findOne: (filter: Record<string, unknown>) => {
      conversationFilters.push(filter);
      return query(conversation);
    },
  };
  let leadUpdate: Record<string, unknown> | undefined;
  const service = makeService({
    conversationModel,
    leadModel: {
      updateOne: (_filter: unknown, update: Record<string, unknown>) => {
        leadUpdate = update;
        return query({ modifiedCount: 1 });
      },
    },
    propertyModel: { findOne: () => query(property) },
    advertisementModel: { findOne: () => query(advertisement) },
  });

  const result = await service.startVisitorConversation(
    String(propertyId),
    rawToken,
    { visitorName: 'Updated visitor' },
  );

  assert.equal(result.id, String(conversationId));
  assert.equal(result.visitorName, 'Updated visitor');
  assert.equal(conversationFilters.length, 2);
  assert.equal(conversationFilters[0].visitorHash, visitorHash);
  assert.equal(conversationFilters[1].visitorHash, visitorHash);
  assert.equal(leadUpdate?.$set && (leadUpdate.$set as Record<string, unknown>).conversationId, conversationId);
});

test('new visitor conversations link the published property, advertisement, and deduplicated lead', async () => {
  const rawToken = 'c'.repeat(64);
  const visitorHash = makeService().hashVisitorSessionToken(rawToken);
  const propertyId = new Types.ObjectId();
  const agentId = new Types.ObjectId();
  const advertisementId = new Types.ObjectId();
  const leadId = new Types.ObjectId();
  const conversationId = new Types.ObjectId();
  const property = { _id: propertyId, agentId, title: 'Published property', status: 'published' };
  const advertisement = { _id: advertisementId, agentId };
  const savedConversation = {
    _id: conversationId,
    propertyId: {
      _id: propertyId,
      title: 'Published property',
      images: ['https://images.example.test/property.jpg'],
      location: { area: 'Area', city: 'City' },
      price: 100,
      purpose: 'Sale',
      propertyType: 'House',
      areaSize: 5,
      areaUnit: 'Marla',
      inventoryStatus: 'available',
    },
    agentId: { _id: agentId, name: 'Agent' },
    advertisementId,
    leadId,
    visitorName: 'New visitor',
    visitorHash,
    status: PropertyConversationStatus.ACTIVE,
    latestMessagePreview: '',
    lastMessageAt: new Date(),
    unreadForAgent: 0,
    unreadForVisitor: 0,
  };
  const conversationFindFilters: Record<string, unknown>[] = [];
  let leadUpsertFilter: Record<string, unknown> | undefined;
  let conversationUpsertFilter: Record<string, unknown> | undefined;
  let conversationUpsertChanges: Record<string, unknown> | undefined;
  let linkedLead: Record<string, unknown> | undefined;
  const service = makeService({
    conversationModel: {
      findOne: (filter: Record<string, unknown>) => {
        conversationFindFilters.push(filter);
        return query(conversationFindFilters.length === 1 ? null : savedConversation);
      },
      countDocuments: () => query(0),
      findOneAndUpdate: (
        filter: Record<string, unknown>,
        update: Record<string, unknown>,
      ) => {
        conversationUpsertFilter = filter;
        conversationUpsertChanges = update;
        return query(savedConversation);
      },
    },
    leadModel: {
      findOneAndUpdate: (filter: Record<string, unknown>) => {
        leadUpsertFilter = filter;
        return query({ _id: leadId });
      },
      updateOne: (_filter: unknown, update: Record<string, unknown>) => {
        linkedLead = update.$set as Record<string, unknown>;
        return query({ modifiedCount: 1 });
      },
    },
    propertyModel: { findOne: () => query(property) },
    advertisementModel: { findOne: () => query(advertisement) },
  });

  const result = await service.startVisitorConversation(
    String(propertyId),
    rawToken,
    { visitorName: 'New visitor' },
  );

  assert.equal(result.id, String(conversationId));
  assert.equal(result.propertyId, String(propertyId));
  assert.equal(result.advertisementId, String(advertisementId));
  assert.equal(result.leadId, String(leadId));
  assert.equal(leadUpsertFilter?.agentId, property.agentId);
  assert.equal(leadUpsertFilter?.propertyId, propertyId);
  assert.equal(leadUpsertFilter?.visitorHash, visitorHash);
  assert.equal(conversationUpsertFilter?.propertyId, propertyId);
  assert.equal(
    (conversationUpsertChanges?.$setOnInsert as Record<string, unknown>).agentId,
    agentId,
  );
  assert.equal(linkedLead?.conversationId, conversationId);
});

test('agent conversation lookup scopes queries by authenticated agent ownership', async () => {
  const conversationId = new Types.ObjectId();
  const agentId = new Types.ObjectId();
  let filter: Record<string, unknown> | undefined;
  const service = makeService({
    conversationModel: {
      findOne: (queryFilter: Record<string, unknown>) => {
        filter = queryFilter;
        return query(null);
      },
    },
  });

  await assert.rejects(
    service.getAgentConversation(String(conversationId), {
      id: String(agentId),
      role: 'agent',
    }),
    NotFoundException,
  );
  assert.equal(filter?._id, String(conversationId));
  assert.equal(String(filter?.agentId), String(agentId));

  await assert.rejects(
    service.getAgentConversation(String(conversationId), {
      id: String(agentId),
      role: 'buyer',
    }),
    ForbiddenException,
  );
});

test('visitor can read only a conversation bound to the visitor session hash', async () => {
  const conversationId = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  const sessionHash = makeService().hashVisitorSessionToken('b'.repeat(64));
  let filter: Record<string, unknown> | undefined;
  const service = makeService({
    conversationModel: {
      findOne: (queryFilter: Record<string, unknown>) => {
        filter = queryFilter;
        return query(null);
      },
    },
  });

  await assert.rejects(
    service.getMessages(
      String(conversationId),
      { id: '', role: 'visitor' },
      { tokenHash: sessionHash, propertyId },
    ),
    NotFoundException,
  );
  assert.equal(filter?._id, String(conversationId));
  assert.equal(filter?.visitorHash, sessionHash);
  assert.equal(String(filter?.propertyId), String(propertyId));
});

test('visitor cannot use a valid session to access another conversation or property', async () => {
  const conversationId = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  const token = 'c'.repeat(64);
  let filter: Record<string, unknown> | undefined;
  const service = makeService({
    visitorSessionModel: {
      findOne: (queryFilter: Record<string, unknown>) =>
        query({
          tokenHash: queryFilter.tokenHash,
          propertyId,
          expiresAt: new Date(Date.now() + 60_000),
        }),
    },
    conversationModel: {
      findOne: (queryFilter: Record<string, unknown>) => {
        filter = queryFilter;
        return query(null);
      },
    },
  });

  await assert.rejects(
    service.getVisitorConversation(String(conversationId), token),
    NotFoundException,
  );
  assert.equal(filter?._id, String(conversationId));
  assert.equal(
    filter?.visitorHash,
    service.hashVisitorSessionToken(token),
  );
  assert.equal(String(filter?.propertyId), String(propertyId));
});

test('valid visitor messages are persisted in the session-owned conversation', async () => {
  const conversationId = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  const token = 'd'.repeat(64);
  const conversation = {
    _id: conversationId,
    propertyId,
    visitorHash: makeService().hashVisitorSessionToken(token),
    status: PropertyConversationStatus.ACTIVE,
  };
  const createdMessages: Record<string, unknown>[] = [];
  const service = makeService({
    visitorSessionModel: {
      findOne: (filter: Record<string, unknown>) =>
        query({
          tokenHash: filter.tokenHash,
          propertyId,
          expiresAt: new Date(Date.now() + 60_000),
        }),
    },
    conversationModel: {
      findOne: () => query(conversation),
      updateOne: () => query({ modifiedCount: 1 }),
    },
    messageModel: {
      findOne: () => query(null),
      countDocuments: () => query(0),
      create: async (message: Record<string, unknown>) => {
        createdMessages.push(message);
        return {
          ...message,
          _id: new Types.ObjectId(),
          createdAt: new Date(),
          readAt: null,
        };
      },
    },
  });

  const result = await service.sendVisitorMessage(
    String(conversationId),
    token,
    {
      content: 'I would like to arrange a viewing.',
      idempotencyKey: '7981c8b0-bcc9-43f3-aea3-52f80f088718',
    } as SendPropertyMessageDto,
    '192.0.2.30',
  );

  assert.equal(result.senderType, 'visitor');
  assert.equal(result.content, 'I would like to arrange a viewing.');
  assert.equal(createdMessages.length, 1);
  assert.equal(String(createdMessages[0].conversationId), String(conversationId));
  assert.equal(createdMessages[0].senderType, 'visitor');
});

test('visitor message limits apply per visitor, IP, property, and chat', () => {
  const rateLimits = new AuthRateLimitService();
  for (let index = 0; index < 20; index += 1) {
    rateLimits.consume(
      'visitor-message',
      '192.0.2.40',
      'visitor-a',
      ['property-a', 'property-a:chat-a'],
    );
  }
  assert.throws(
    () =>
      rateLimits.consume(
        'visitor-message',
        '192.0.2.41',
        'visitor-a',
        ['property-a', 'property-a:chat-a'],
      ),
    (error: unknown) =>
      error instanceof HttpException && error.getStatus() === 429,
  );

  const propertyLimits = new AuthRateLimitService();
  for (let index = 0; index < 100; index += 1) {
    propertyLimits.consume(
      'visitor-message',
      `192.0.2.${index}`,
      `visitor-${index}`,
      ['property-a', `property-a:chat-${index}`],
    );
  }
  assert.throws(
    () =>
      propertyLimits.consume(
        'visitor-message',
        '192.0.3.1',
        'visitor-extra',
        ['property-a', 'property-a:chat-extra'],
      ),
    (error: unknown) =>
      error instanceof HttpException && error.getStatus() === 429,
  );

  const ipLimits = new AuthRateLimitService();
  for (let index = 0; index < 120; index += 1) {
    ipLimits.consume(
      'visitor-message',
      '192.0.2.50',
      `visitor-${index}`,
      [`property-${index}`, `property-${index}:chat-${index}`],
    );
  }
  assert.throws(
    () =>
      ipLimits.consume(
        'visitor-message',
        '192.0.2.50',
        'visitor-extra',
        ['property-extra', 'property-extra:chat-extra'],
      ),
    (error: unknown) =>
      error instanceof HttpException && error.getStatus() === 429,
  );
});

test('buyer conversation lookup scopes ownership and omits CRM and private agent fields', async () => {
  const conversationId = new Types.ObjectId();
  const buyerId = new Types.ObjectId();
  let filter: Record<string, unknown> | undefined;
  const conversation = {
    _id: conversationId,
    propertyId: {
      _id: new Types.ObjectId(),
      title: 'Public listing',
      images: [],
      location: { city: 'Lahore', area: 'Gulberg' },
      price: 100,
      purpose: 'Sale',
      propertyType: 'House',
      areaSize: 5,
      areaUnit: 'Marla',
      inventoryStatus: 'available',
    },
    leadId: new Types.ObjectId(),
    agentId: new Types.ObjectId(),
    status: PropertyConversationStatus.ACTIVE,
    unreadForVisitor: 2,
    unreadForAgent: 0,
    lastMessageAt: new Date(),
  };
  const service = makeService({
    conversationModel: {
      findOne: (queryFilter: Record<string, unknown>) => {
        filter = queryFilter;
        return query(conversation);
      },
    },
  });

  const result = await service.getBuyerConversation(
    String(conversationId),
    String(buyerId),
  );
  assert.equal(String(filter?.buyerId), String(buyerId));
  assert.equal(filter?._id, String(conversationId));
  assert.equal(result.id, String(conversationId));
  assert.equal(result.unreadMessages, 2);
  assert.equal('leadId' in result, false);
  assert.equal('agentId' in result, false);
});

test('authenticated buyer inquiry creates a deduplicated CRM lead and owned conversation', async () => {
  const serviceSecret = makeService();
  const propertyId = new Types.ObjectId();
  const buyerId = new Types.ObjectId();
  const agentId = new Types.ObjectId();
  const advertisementId = new Types.ObjectId();
  const leadId = new Types.ObjectId();
  const conversationId = new Types.ObjectId();
  const property = {
    _id: propertyId,
    agentId,
    title: 'Published property',
    status: 'published',
  };
  const advertisement = { _id: advertisementId, agentId };
  const conversation = {
    _id: conversationId,
    propertyId: {
      _id: propertyId,
      title: 'Published property',
      images: [],
      location: { area: 'Area', city: 'City' },
      price: 100,
      purpose: 'Sale',
      propertyType: 'House',
      areaSize: 5,
      areaUnit: 'Marla',
      inventoryStatus: 'available',
    },
    leadId,
    status: PropertyConversationStatus.ACTIVE,
    unreadForVisitor: 0,
    unreadForAgent: 0,
  };
  const conversationFilters: Record<string, unknown>[] = [];
  let leadFilter: Record<string, unknown> | undefined;
  let conversationUpdate: Record<string, unknown> | undefined;
  let linkedLead: Record<string, unknown> | undefined;
  const service = makeService({
    propertyModel: { findOne: () => query(property) },
    advertisementModel: { findOne: () => query(advertisement) },
    conversationModel: {
      findOne: (filter: Record<string, unknown>) => {
        conversationFilters.push(filter);
        return query(conversationFilters.length === 1 ? null : conversation);
      },
      findOneAndUpdate: (_filter: unknown, update: Record<string, unknown>) => {
        conversationUpdate = update;
        return query(conversation);
      },
    },
    leadModel: {
      findOneAndUpdate: (filter: Record<string, unknown>) => {
        leadFilter = filter;
        return query({ _id: leadId });
      },
      updateOne: (_filter: unknown, update: Record<string, unknown>) => {
        linkedLead = update.$set as Record<string, unknown>;
        return query({ modifiedCount: 1 });
      },
    },
  });

  const result = await service.startBuyerConversation(
    String(propertyId),
    String(buyerId),
    { visitorName: 'Buyer Name', visitorEmail: 'buyer@example.test' },
  );
  const buyerHash = serviceSecret.hashVisitorSessionToken('a'.repeat(64));
  assert.equal(result.id, String(conversationId));
  assert.equal(conversationFilters[0].propertyId, propertyId);
  assert.equal((conversationFilters[0].$or as unknown[]).length, 2);
  assert.equal(leadFilter?.agentId, agentId);
  assert.equal(leadFilter?.propertyId, propertyId);
  assert.equal(typeof leadFilter?.visitorHash, 'string');
  assert.notEqual(leadFilter?.visitorHash, buyerHash);
  assert.equal(
    String((conversationUpdate?.$setOnInsert as Record<string, unknown>).buyerId),
    String(buyerId),
  );
  assert.equal(String(linkedLead?.buyerId), String(buyerId));
});

test('buyer and assigned agent persist messages in the same owned conversation', async () => {
  const conversationId = new Types.ObjectId();
  const buyerId = new Types.ObjectId();
  const agentId = new Types.ObjectId();
  const conversation = {
    _id: conversationId,
    buyerId,
    agentId,
    propertyId: new Types.ObjectId(),
    status: PropertyConversationStatus.ACTIVE,
  };
  const accessFilters: Record<string, unknown>[] = [];
  const createdMessages: Record<string, unknown>[] = [];
  const service = makeService({
    conversationModel: {
      findOne: (filter: Record<string, unknown>) => {
        accessFilters.push(filter);
        return query(conversation);
      },
      updateOne: () => query({ modifiedCount: 1 }),
    },
    messageModel: {
      findOne: () => query(null),
      countDocuments: () => query(0),
      create: async (message: Record<string, unknown>) => {
        createdMessages.push(message);
        return {
          ...message,
          _id: new Types.ObjectId(),
          createdAt: new Date(),
          readAt: null,
        };
      },
    },
  });

  await service.sendAgentMessage(
    String(conversationId),
    { id: String(agentId), role: 'agent' },
    {
      content: 'I can arrange a viewing.',
      idempotencyKey: 'requirement-offer:123',
    } as SendPropertyMessageDto,
  );
  await service.sendBuyerMessage(
    String(conversationId),
    String(buyerId),
    {
      content: 'Thank you, Saturday works.',
      idempotencyKey: 'buyer-message-key',
    } as SendPropertyMessageDto,
  );

  assert.equal(accessFilters.length, 2);
  assert.equal(String(accessFilters[0].agentId), String(agentId));
  assert.equal(String(accessFilters[1].buyerId), String(buyerId));
  assert.equal(createdMessages.length, 2);
  assert.equal(String(createdMessages[0].conversationId), String(conversationId));
  assert.equal(createdMessages[0].senderType, 'agent');
  assert.equal(createdMessages[0].content, 'I can arrange a viewing.');
  assert.equal(String(createdMessages[1].conversationId), String(conversationId));
  assert.equal(createdMessages[1].senderType, 'buyer');
  assert.equal(createdMessages[1].content, 'Thank you, Saturday works.');
});

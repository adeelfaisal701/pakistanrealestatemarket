import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { BuyerNotificationType } from '../src/modules/buyer/schemas/buyer-notification.schema';
import { RequirementsService } from '../src/modules/requirements/requirements.service';
import { VerifiedAgentGuard } from '../src/modules/requirements/verified-agent.guard';
import { ClientRequirementStatus } from '../src/modules/requirements/schemas/client-requirement.schema';
import { rankRequirementProperties } from '../../frontend/src/lib/requirements';
import {
  AgentVerificationStatus,
  UserAccountStatus,
  UserRole,
} from '../src/modules/users/schemas/user.schema';

function query<T>(value: T) {
  const result: Record<string, unknown> = {
    select: () => result,
    populate: () => result,
    sort: () => result,
    limit: () => result,
    skip: () => result,
    lean: () => result,
    exec: async () => value,
  };
  return result;
}

function aggregate<T>(value: T) {
  return Promise.resolve(value);
}

function makeService(overrides: Record<string, unknown> = {}) {
  return new RequirementsService(
    (overrides.requirementModel ?? {}) as never,
    (overrides.offerModel ?? {}) as never,
    (overrides.userModel ?? {}) as never,
    (overrides.propertyModel ?? {}) as never,
    (overrides.advertisementModel ?? {}) as never,
    (overrides.notificationModel ?? {}) as never,
    (overrides.activityModel ?? {}) as never,
    (overrides.messagingService ?? {}) as never,
  );
}

test('published agent requirements omit owner identity and redact contact details in free text', async () => {
  const requirementId = new Types.ObjectId();
  const service = makeService({
    requirementModel: {
      find: () => query([{
        _id: requirementId,
        buyerId: new Types.ObjectId(),
        title: 'Looking for a home, buyer@example.com',
        description: 'Please call 03001234567 about this home.',
        status: ClientRequirementStatus.PUBLISHED,
        location: { city: 'Lahore', area: 'Bahria Town' },
      }]),
    },
    offerModel: {
      find: () => query([]),
      aggregate: () => aggregate([]),
    },
  });

  const [result] = await service.getPublishedRequirements(
    String(new Types.ObjectId()),
  ) as Array<Record<string, unknown>>;

  assert.equal('buyerId' in result, false);
  assert.equal(result.title, 'Looking for a home, [contact details hidden]');
  assert.equal(result.description, 'Please call [contact details hidden] about this home.');
});

test('buyer requirement lookup scopes by the authenticated owner', async () => {
  const buyerId = new Types.ObjectId();
  let filter: Record<string, unknown> | undefined;
  const service = makeService({
    requirementModel: {
      findOne: (value: Record<string, unknown>) => {
        filter = value;
        return query(null);
      },
    },
  });

  await assert.rejects(
    service.getBuyerRequirement(String(buyerId), String(new Types.ObjectId())),
    NotFoundException,
  );
  assert.deepEqual(filter?.buyerId, buyerId);
});

test('buyer requirements list includes every owned status and counts matching offer records', async () => {
  const buyerId = new Types.ObjectId();
  const requirementIds = [new Types.ObjectId(), new Types.ObjectId()];
  let requirementFilter: Record<string, unknown> | undefined;
  let offerFilter: Record<string, unknown> | undefined;
  const service = makeService({
    requirementModel: {
      find: (filter: Record<string, unknown>) => {
        requirementFilter = filter;
        return query([
          { _id: requirementIds[0], status: 'published' },
          { _id: requirementIds[1], status: 'closed' },
        ]);
      },
    },
    offerModel: {
      find: (filter: Record<string, unknown>) => {
        offerFilter = filter;
        return query([
          {
            _id: new Types.ObjectId(),
            requirementId: requirementIds[0],
            propertyId: { _id: new Types.ObjectId(), title: 'First listing' },
            message: 'First offer',
            status: 'pending',
          },
          {
            _id: new Types.ObjectId(),
            requirementId: requirementIds[0],
            propertyId: { _id: new Types.ObjectId(), title: 'Second listing' },
            message: 'Second offer',
            status: 'rejected',
          },
          {
            _id: new Types.ObjectId(),
            requirementId: requirementIds[1],
            propertyId: { _id: new Types.ObjectId(), title: 'Third listing' },
            message: 'Third offer',
            status: 'pending',
          },
        ]);
      },
    },
  });

  const result = await service.getBuyerRequirements(String(buyerId));

  assert.deepEqual(requirementFilter?.buyerId, buyerId);
  assert.equal(result.length, 2);
  assert.equal(result[0].status, 'published');
  assert.equal(result[0].offerCount, 2);
  assert.equal(result[0].offers?.length, 2);
  assert.equal(result[0].offers?.[0].message, 'First offer');
  assert.equal(result[1].status, 'closed');
  assert.equal(result[1].offerCount, 1);
  assert.equal(result[1].offers?.length, 1);
  assert.equal(result[1].offers?.[0].message, 'Third offer');
  assert.deepEqual(
    (offerFilter?.requirementId as { $in: Types.ObjectId[] }).$in,
    requirementIds,
  );
});

test('buyer requirement details return submitted offers with listing data and message', async () => {
  const buyerId = new Types.ObjectId();
  const requirementId = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  const offerId = new Types.ObjectId();
  const requirement = {
    _id: requirementId,
    buyerId,
    title: 'Family home',
    status: ClientRequirementStatus.PUBLISHED,
    toObject: () => ({ _id: requirementId, title: 'Family home' }),
  };
  const service = makeService({
    requirementModel: {
      findOne: () => query(requirement),
    },
    offerModel: {
      find: () => query([{
        _id: offerId,
        message: 'This listing is available for viewing.',
        status: 'pending',
        createdAt: new Date(),
        agentId: { name: 'Verified agent' },
        propertyId: {
          _id: propertyId,
          title: 'Bahria home',
          images: ['https://example.test/property.jpg'],
          location: { area: 'Bahria Town', city: 'Lahore' },
        },
      }]),
    },
  });

  const result = await service.getBuyerRequirement(String(buyerId), String(requirementId));

  assert.equal(result.offers.length, 1);
  assert.equal(result.offers[0].id, String(offerId));
  assert.equal(result.offers[0].message, 'This listing is available for viewing.');
  const returnedProperty = result.offers[0].property;
  assert.ok(returnedProperty && typeof returnedProperty === 'object');
  assert.equal('id' in returnedProperty ? returnedProperty.id : undefined, String(propertyId));
  assert.deepEqual(
    'images' in returnedProperty ? returnedProperty.images : undefined,
    ['https://example.test/property.jpg'],
  );
});

test('agent offers expose the buyer response status and original agent message', async () => {
  const agentId = new Types.ObjectId();
  const offerId = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  const service = makeService({
    offerModel: {
      find: () => query([{
        _id: offerId,
        agentId,
        message: 'Please let me know if you want to view it.',
        status: 'rejected',
        createdAt: new Date(),
        conversationId: null,
        requirementId: { title: 'Family home' },
        propertyId: { _id: propertyId, title: 'Bahria home' },
      }]),
    },
  });

  const [offer] = await service.getAgentOffers(String(agentId));

  assert.equal(offer.id, String(offerId));
  assert.equal(offer.status, 'rejected');
  assert.equal(offer.message, 'Please let me know if you want to view it.');
  assert.equal(offer.requirement?.title, 'Family home');
  assert.equal(
    offer.property && typeof offer.property === 'object' && 'id' in offer.property
      ? offer.property.id
      : undefined,
    String(propertyId),
  );
});

test('requirement creation rejects locations outside Bahria Town Lahore before persistence', async () => {
  let createCalled = false;
  const service = makeService({
    requirementModel: {
      create: async () => {
        createCalled = true;
        return {};
      },
    },
  });

  await assert.rejects(
    service.createRequirement(String(new Types.ObjectId()), {
      title: 'Need a house',
      description: 'A family home',
      purpose: 'buy',
      propertyType: 'House',
      location: { city: 'Lahore', area: 'DHA' },
    } as never),
    BadRequestException,
  );
  assert.equal(createCalled, false);
});

test('verified-agent guard accepts verified legacy records but rejects ineligible agents', async () => {
  const agentId = String(new Types.ObjectId());
  let filter: Record<string, unknown> | undefined;
  const guard = new VerifiedAgentGuard({
    findOne: (value: Record<string, unknown>) => {
      filter = value;
      return query({
        _id: agentId,
        role: UserRole.AGENT,
        isVerified: true,
        verificationStatus: AgentVerificationStatus.VERIFIED,
        accountStatus: UserAccountStatus.ACTIVE,
      });
    },
  } as never);
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: agentId, role: UserRole.AGENT } }),
    }),
  } as never;

  assert.equal(await guard.canActivate(context), true);
  assert.equal(filter?.role, UserRole.AGENT);
  assert.equal(filter?._id, agentId);

  const legacyGuard = new VerifiedAgentGuard({
    findOne: () => query({ isVerified: true }),
  } as never);
  assert.equal(await legacyGuard.canActivate(context), true);

  for (const ineligibleAgent of [
    { isVerified: false, verificationStatus: AgentVerificationStatus.UNVERIFIED },
    { isVerified: true, verificationStatus: AgentVerificationStatus.PENDING },
    { isVerified: true, verificationStatus: AgentVerificationStatus.REJECTED },
    {
      isVerified: true,
      verificationStatus: AgentVerificationStatus.VERIFIED,
      accountStatus: UserAccountStatus.SUSPENDED,
    },
    {
      isVerified: true,
      verificationStatus: AgentVerificationStatus.VERIFIED,
      accountStatus: UserAccountStatus.DEACTIVATED,
    },
    null,
  ]) {
    const ineligibleGuard = new VerifiedAgentGuard({
      findOne: () => query(ineligibleAgent),
    } as never);
    await assert.rejects(ineligibleGuard.canActivate(context), ForbiddenException);
  }
});

test('agent offers use an owned published listing and notify the requirement owner', async () => {
  const buyerId = new Types.ObjectId();
  const agentId = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  const requirementId = new Types.ObjectId();
  const offerId = new Types.ObjectId();
  const requirement = {
    _id: requirementId,
    title: 'Bahria Town house',
    purpose: 'buy',
    propertyType: 'House',
    location: { city: 'Lahore', area: 'Bahria Town, Sector A' },
    minBudget: 10,
    maxBudget: 100,
    minArea: 5,
    maxArea: 10,
    areaUnit: 'Marla',
  };
  const property = {
    _id: propertyId,
    agentId,
    title: 'Published Bahria house',
    purpose: 'Rent',
    propertyType: 'Flat',
    price: 500,
    areaSize: 2000,
    areaUnit: 'SqFt',
    location: { city: 'Lahore', area: 'DHA' },
  };
  let createdOffer: Record<string, unknown> | undefined;
  let notification: Record<string, unknown> | undefined;
  let reservation: Record<string, unknown> | undefined;
  let advertisementFilter: Record<string, unknown> | undefined;
  let propertyFilter: Record<string, unknown> | undefined;
  const service = makeService({
    requirementModel: {
      findOne: () => query(requirement),
      findOneAndUpdate: (filter: Record<string, unknown>) => {
        reservation = filter;
        return query({ buyerId });
      },
    },
    offerModel: {
      findOne: () => query(null),
      create: async (value: Record<string, unknown>) => {
        createdOffer = value;
        return { _id: offerId, status: 'pending', createdAt: new Date() };
      },
    },
    advertisementModel: {
      findOne: (filter: Record<string, unknown>) => {
        advertisementFilter = filter;
        return query({ _id: new Types.ObjectId() });
      },
    },
    propertyModel: {
      findOne: (filter: Record<string, unknown>) => {
        propertyFilter = filter;
        return query(property);
      },
    },
    notificationModel: {
      updateOne: (_filter: unknown, update: Record<string, unknown>) => {
        notification = update;
        return query({ upsertedCount: 1 });
      },
    },
  });

  const result = await service.createOffer(String(agentId), String(requirementId), {
    propertyId: String(propertyId),
  });

  assert.equal(result.id, String(offerId));
  assert.equal(String(createdOffer?.agentId), String(agentId));
  assert.equal(String(createdOffer?.propertyId), String(propertyId));
  assert.equal(createdOffer?.message, '');
  assert.equal(String(advertisementFilter?.agentId), String(agentId));
  assert.equal(String(advertisementFilter?.propertyId), String(propertyId));
  assert.equal(advertisementFilter?.status, 'published');
  assert.equal(String(propertyFilter?.agentId), String(agentId));
  assert.equal(String(propertyFilter?._id), String(propertyId));
  assert.equal(propertyFilter?.status, 'published');
  assert.equal(propertyFilter?.inventoryStatus, 'available');
  assert.equal(
    String((reservation?.offeredAgentIds as { $ne: Types.ObjectId }).$ne),
    String(agentId),
  );
  assert.equal(
    String(notification?.$setOnInsert && (notification.$setOnInsert as Record<string, unknown>).buyerId),
    String(buyerId),
  );
  assert.equal(notification?.$setOnInsert && (notification.$setOnInsert as Record<string, unknown>).type, BuyerNotificationType.REQUIREMENT_OFFER);
});

test('eligible listing API returns all active published listings owned by the requesting agent', async () => {
  const agentId = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  let advertisementFilter: Record<string, unknown> | undefined;
  let propertyFilter: Record<string, unknown> | undefined;
  const service = makeService({
    advertisementModel: {
      find: (filter: Record<string, unknown>) => {
        advertisementFilter = filter;
        return query([{ propertyId }]);
      },
    },
    propertyModel: {
      find: (filter: Record<string, unknown>) => {
        propertyFilter = filter;
        return query([{
          _id: propertyId,
          title: 'Other area apartment',
          purpose: 'Rent',
          propertyType: 'Flat',
          price: 250000,
          areaSize: 900,
          areaUnit: 'SqFt',
          location: { city: 'Lahore', area: 'DHA' },
          features: { bedrooms: 2, bathrooms: 2 },
        }]);
      },
    },
  });

  const properties = await service.getEligibleProperties(String(agentId));

  assert.equal(properties.length, 1);
  assert.equal(properties[0].id, String(propertyId));
  assert.equal(properties[0].bedrooms, 2);
  assert.equal(properties[0].bathrooms, 2);
  assert.equal(String(advertisementFilter?.agentId), String(agentId));
  assert.equal(advertisementFilter?.status, 'published');
  assert.equal(String(propertyFilter?.agentId), String(agentId));
  assert.equal(propertyFilter?.status, 'published');
  assert.equal(propertyFilter?.inventoryStatus, 'available');
  assert.deepEqual(propertyFilter?.adminHidden, { $ne: true });
  assert.deepEqual(propertyFilter?.adminRemoved, { $ne: true });
  assert.deepEqual(propertyFilter?.agentArchived, { $ne: true });
});

test('matching listings rank exact matches above partial and unmatched listings', () => {
  const requirement = {
    id: 'requirement',
    title: 'Family home',
    description: 'Looking in Bahria Town',
    purpose: 'buy',
    propertyType: 'House',
    location: { city: 'Lahore', area: 'Bahria Town, Sector A' },
    minBudget: 10,
    maxBudget: 20,
    minArea: 5,
    maxArea: 10,
    areaUnit: 'Marla',
    bedrooms: 3,
    bathrooms: 2,
    status: 'published',
    createdAt: new Date().toISOString(),
  } as const;
  const properties = [
    {
      id: 'partial',
      title: 'A larger house',
      purpose: 'Sale',
      propertyType: 'House',
      price: 21,
      areaSize: 8,
      areaUnit: 'Marla',
      bedrooms: 3,
      bathrooms: 2,
      location: { city: 'Lahore', area: 'Bahria Town, Sector B' },
    },
    {
      id: 'exact',
      title: 'Matching house',
      purpose: 'Sale',
      propertyType: 'House',
      price: 15,
      areaSize: 8,
      areaUnit: 'Marla',
      bedrooms: 4,
      bathrooms: 3,
      location: { city: 'Lahore', area: 'Bahria Town, Sector A' },
    },
    {
      id: 'other',
      title: 'Other city plot',
      purpose: 'Rent',
      propertyType: 'Plot',
      price: 100,
      areaSize: 1,
      areaUnit: 'Kanal',
      location: { city: 'Karachi', area: 'Other' },
    },
  ];

  const result = rankRequirementProperties(requirement, properties);

  assert.deepEqual(result.matching.map(({ property }) => property.id), ['exact', 'partial']);
  assert.equal(result.matching[0].strength, 'strong');
  assert.equal(result.matching[1].strength, 'partial');
  assert.deepEqual(result.other.map(({ id }) => id), ['other']);
});

test('agent cannot submit another offer after a per-requirement reservation is taken', async () => {
  const agentId = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  const requirementId = new Types.ObjectId();
  let createCalled = false;
  const service = makeService({
    requirementModel: {
      findOne: () => query({
        _id: requirementId,
        title: 'Bahria Town house',
        purpose: 'buy',
        propertyType: 'House',
        location: { city: 'Lahore', area: 'Bahria Town' },
      }),
      findOneAndUpdate: () => query(null),
    },
    offerModel: {
      findOne: () => query(null),
      create: async () => {
        createCalled = true;
        return {};
      },
    },
    advertisementModel: {
      findOne: () => query({ _id: new Types.ObjectId() }),
    },
    propertyModel: {
      findOne: () => query({
        _id: propertyId,
        purpose: 'Sale',
        propertyType: 'House',
        price: 50,
        areaSize: 5,
        areaUnit: 'Marla',
        location: { city: 'Lahore', area: 'Bahria Town' },
      }),
    },
  });

  await assert.rejects(
    service.createOffer(String(agentId), String(requirementId), {
      propertyId: String(propertyId),
      message: 'Please consider my listing.',
    }),
    ConflictException,
  );
  assert.equal(createCalled, false);
});

test('accepting an offer updates only that offer and links its agent message to the buyer conversation', async () => {
  const buyerId = new Types.ObjectId();
  const agentId = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  const requirementId = new Types.ObjectId();
  const offerId = new Types.ObjectId();
  const conversationId = new Types.ObjectId();
  const requirement = {
    _id: requirementId,
    buyerId,
    status: ClientRequirementStatus.PUBLISHED,
    toObject: () => ({ _id: requirementId }),
  };
  const pendingOffer = {
    _id: offerId,
    requirementId,
    agentId,
    propertyId,
    message: 'I can arrange a viewing this weekend.',
    status: 'pending',
    createdAt: new Date(),
  };
  let linkedOfferUpdate: Record<string, unknown> | undefined;
  let sentMessage: Record<string, unknown> | undefined;
  let startedConversation: Record<string, unknown> | undefined;
  let offerFilter: Record<string, unknown> | undefined;
  let requirementMutationCount = 0;
  let rejectedOtherOffers = false;
  const service = makeService({
    requirementModel: {
      findOne: () => query(requirement),
      findOneAndUpdate: () => {
        requirementMutationCount += 1;
        return query(requirement);
      },
      updateOne: () => {
        requirementMutationCount += 1;
        return query({ modifiedCount: 1 });
      },
    },
    offerModel: {
      findOne: () => query(pendingOffer),
      findOneAndUpdate: (filter: Record<string, unknown>) => {
        offerFilter = filter;
        return query({
          ...pendingOffer,
          requirementId,
          status: 'accepted',
          respondedAt: new Date(),
        });
      },
      updateOne: (_filter: unknown, update: Record<string, unknown>) => {
        linkedOfferUpdate = update;
        return query({ matchedCount: 1, modifiedCount: 1 });
      },
      updateMany: () => {
        rejectedOtherOffers = true;
        return query({ modifiedCount: 0 });
      },
    },
    userModel: {
      findById: () => query({
        name: 'Buyer name',
        email: 'buyer@example.test',
        phone: '03001234567',
      }),
    },
    advertisementModel: {
      findOne: () => query({ _id: new Types.ObjectId() }),
    },
    propertyModel: {
      findOne: () => query({ _id: propertyId, agentId }),
    },
    messagingService: {
      startBuyerConversation: async (
        passedPropertyId: string,
        passedBuyerId: string,
        identity: Record<string, unknown>,
      ) => {
        startedConversation = { passedPropertyId, passedBuyerId, identity };
        return { id: String(conversationId) };
      },
      sendAgentMessage: async (
        passedConversationId: string,
        requester: Record<string, unknown>,
        dto: Record<string, unknown>,
      ) => {
        sentMessage = { passedConversationId, requester, dto };
      },
    },
  });

  const result = await service.respondToOffer(
    String(buyerId),
    String(requirementId),
    String(offerId),
    'accepted',
  );

  assert.equal(result.status, 'accepted');
  assert.equal(result.conversationId, String(conversationId));
  assert.equal(String(offerFilter?._id), String(offerId));
  assert.equal(String(offerFilter?.requirementId), String(requirementId));
  assert.equal(offerFilter?.status, 'pending');
  assert.equal(requirementMutationCount, 0);
  assert.equal(rejectedOtherOffers, false);
  assert.equal(startedConversation?.passedPropertyId, String(propertyId));
  assert.equal(startedConversation?.passedBuyerId, String(buyerId));
  assert.deepEqual(startedConversation?.identity, {
    visitorName: 'Buyer name',
    visitorEmail: 'buyer@example.test',
    visitorPhone: '03001234567',
  });
  assert.equal(sentMessage?.passedConversationId, String(conversationId));
  assert.equal(sentMessage?.requester && (sentMessage.requester as Record<string, unknown>).id, String(agentId));
  assert.equal(sentMessage?.dto && (sentMessage.dto as Record<string, unknown>).content, pendingOffer.message);
  assert.deepEqual(
    linkedOfferUpdate?.$set && (linkedOfferUpdate.$set as Record<string, unknown>).conversationId,
    conversationId,
  );
});

test('buyer can reject a pending offer only within their own published requirement', async () => {
  const buyerId = new Types.ObjectId();
  const requirementId = new Types.ObjectId();
  const offerId = new Types.ObjectId();
  let offerFilter: Record<string, unknown> | undefined;
  const service = makeService({
    requirementModel: {
      findOne: (filter: Record<string, unknown>) => {
        assert.deepEqual(filter.buyerId, buyerId);
        return query({
          _id: requirementId,
          buyerId,
          status: ClientRequirementStatus.PUBLISHED,
        });
      },
    },
    offerModel: {
      findOne: (filter: Record<string, unknown>) => {
        assert.equal(String(filter._id), String(offerId));
        assert.equal(String(filter.requirementId), String(requirementId));
        return query({ _id: offerId, requirementId, status: 'pending' });
      },
      findOneAndUpdate: (filter: Record<string, unknown>) => {
        offerFilter = filter;
        return query({ _id: offerId, requirementId, status: 'rejected' });
      },
    },
  });

  const result = await service.respondToOffer(
    String(buyerId),
    String(requirementId),
    String(offerId),
    'rejected',
  );

  assert.equal(result.status, 'rejected');
  assert.equal(String(result.id), String(offerId));
  assert.equal(String(offerFilter?.requirementId), String(requirementId));
  assert.equal(String(offerFilter?._id), String(offerId));
  assert.equal(offerFilter?.status, 'pending');
});

test('buyer can accept and reject three offers independently without changing the others', async () => {
  const buyerId = new Types.ObjectId();
  const agentId = new Types.ObjectId();
  const requirementId = new Types.ObjectId();
  const propertyIds = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()];
  const offerIds = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()];
  const conversationId = new Types.ObjectId();
  const requirement = {
    _id: requirementId,
    buyerId,
    status: ClientRequirementStatus.PUBLISHED,
    toObject: () => ({ _id: requirementId, status: requirement.status }),
  };
  const offers = offerIds.map((offerId, index) => ({
    _id: offerId,
    requirementId,
    agentId,
    propertyId: propertyIds[index],
    message: `Offer ${index + 1}`,
    status: 'pending',
    createdAt: new Date(),
    respondedAt: null as Date | null,
    conversationId: null as Types.ObjectId | null,
  }));
  const service = makeService({
    requirementModel: {
      findOne: (filter: Record<string, unknown>) => query(
        String(filter.buyerId) === String(buyerId) ? requirement : null,
      ),
    },
    offerModel: {
      find: () => query(offers),
      findOne: (filter: Record<string, unknown>) => query(
        offers.find((offer) =>
          String(offer._id) === String(filter._id) &&
          String(offer.requirementId) === String(filter.requirementId),
        ) ?? null,
      ),
      findOneAndUpdate: (filter: Record<string, unknown>, update: Record<string, unknown>) => {
        const offer = offers.find((candidate) =>
          String(candidate._id) === String(filter._id) &&
          String(candidate.requirementId) === String(filter.requirementId) &&
          candidate.status === filter.status,
        );
        if (!offer) return query(null);
        const changes = update.$set as Record<string, unknown>;
        Object.assign(offer, changes);
        return query({ ...offer });
      },
      updateOne: (filter: Record<string, unknown>, update: Record<string, unknown>) => {
        const offer = offers.find((candidate) =>
          String(candidate._id) === String(filter._id) &&
          String(candidate.requirementId) === String(filter.requirementId),
        );
        if (offer) Object.assign(offer, update.$set);
        return query({ matchedCount: offer ? 1 : 0, modifiedCount: offer ? 1 : 0 });
      },
    },
    userModel: {
      findById: () => query({ name: 'Buyer name', email: 'buyer@example.test' }),
    },
    advertisementModel: {
      findOne: () => query({ _id: new Types.ObjectId() }),
    },
    propertyModel: {
      findOne: () => query({ _id: propertyIds[0], agentId }),
    },
    messagingService: {
      startBuyerConversation: async () => ({ id: String(conversationId) }),
      sendAgentMessage: async () => undefined,
    },
  });

  const accepted = await service.respondToOffer(
    String(buyerId),
    String(requirementId),
    String(offerIds[0]),
    'accepted',
  );
  const rejected = await service.respondToOffer(
    String(buyerId),
    String(requirementId),
    String(offerIds[1]),
    'rejected',
  );

  assert.equal(accepted.id, String(offerIds[0]));
  assert.equal(accepted.status, 'accepted');
  assert.equal(accepted.conversationId, String(conversationId));
  assert.equal(rejected.id, String(offerIds[1]));
  assert.equal(rejected.status, 'rejected');
  assert.deepEqual(offers.map((offer) => offer.status), ['accepted', 'rejected', 'pending']);
  assert.equal(requirement.status, ClientRequirementStatus.PUBLISHED);
  const refreshed = await service.getBuyerRequirement(
    String(buyerId),
    String(requirementId),
  );
  assert.deepEqual(refreshed.offers.map((offer) => offer.status), ['accepted', 'rejected', 'pending']);

  await assert.rejects(
    service.respondToOffer(
      String(new Types.ObjectId()),
      String(requirementId),
      String(offerIds[2]),
      'rejected',
    ),
    NotFoundException,
  );
  assert.deepEqual(offers.map((offer) => offer.status), ['accepted', 'rejected', 'pending']);
  await assert.rejects(
    service.respondToOffer(
      String(buyerId),
      String(requirementId),
      String(new Types.ObjectId()),
      'accepted',
    ),
    NotFoundException,
  );
});

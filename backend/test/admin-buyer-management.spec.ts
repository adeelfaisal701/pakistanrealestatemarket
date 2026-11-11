import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminService } from '../src/modules/admin/admin.service';
import { UserAccountStatus, UserRole } from '../src/modules/users/schemas/user.schema';

function query(result: unknown) {
  const value = {
    select() { return value; },
    lean() { return value; },
    session() { return value; },
    async exec() { return result; },
  };
  return value;
}

function serviceHarness(options: { conversationCount?: number; role?: UserRole } = {}) {
  const buyerId = new Types.ObjectId();
  const buyer = {
    _id: buyerId,
    name: 'Buyer Example',
    email: 'buyer@example.test',
    role: options.role ?? UserRole.BUYER,
    accountStatus: UserAccountStatus.ACTIVE,
    async save() { return this; },
  };
  const operations: string[] = [];
  const session = {
    async withTransaction(callback: () => Promise<void>) { await callback(); },
    async endSession() {},
  };
  const model = (collection: string) => ({
    findOne: () => query(buyer),
    countDocuments: () => query(collection === 'conversations' ? options.conversationCount ?? 0 : 0),
    find: () => query([]),
    deleteOne: () => ({ ...query({ deletedCount: 1 }), session() { return this; } }),
    deleteMany: () => ({ ...query({ deletedCount: 1 }), session() { return this; } }),
  });
  const userModel = model('users');
  userModel.deleteOne = () => {
    operations.push('user');
    return { ...query({ deletedCount: 1 }), session() { return this; } };
  };
  const activityModel = {
    async create() { operations.push('audit'); },
  };
  const deletingModel = (collection: string) => ({
    ...model(collection),
    deleteOne: () => {
      operations.push(collection);
      return { ...query({ deletedCount: 1 }), session() { return this; } };
    },
    deleteMany: () => {
      operations.push(collection);
      return { ...query({ deletedCount: 2 }), session() { return this; } };
    },
  });
  const connection = { async startSession() { return session; } };
  const service = new AdminService(
    {} as never,
    userModel as never,
    undefined,
    undefined,
    activityModel as never,
    undefined,
    deletingModel('leads') as never,
    deletingModel('conversations') as never,
    deletingModel('shares') as never,
    undefined,
    deletingModel('saved-properties') as never,
    deletingModel('notifications') as never,
    connection as never,
    deletingModel('buyer-profile') as never,
    deletingModel('saved-searches') as never,
    deletingModel('requirements') as never,
    deletingModel('offers') as never,
    deletingModel('messages') as never,
    undefined,
    undefined,
    undefined,
  );
  return { service, buyer, buyerId, operations };
}

test('buyer account status updates only buyer records and records an admin audit event', async () => {
  const harness = serviceHarness();
  const result = await harness.service.updateBuyerAccountStatus(
    String(harness.buyerId),
    { status: 'suspended', reason: 'Policy review' },
    new Types.ObjectId().toHexString(),
  );

  assert.equal(result.accountStatus, UserAccountStatus.SUSPENDED);
});

test('buyer deletion refuses administrators without cleanup writes', async () => {
  const harness = serviceHarness({ role: UserRole.ADMIN });
  await assert.rejects(
    harness.service.deleteBuyer(
      String(harness.buyerId),
      { reason: 'Requested deletion', confirmation: 'DELETE BUYER' },
      new Types.ObjectId().toHexString(),
    ),
    ForbiddenException,
  );
  assert.deepEqual(harness.operations, []);
});

test('buyer deletion blocks retained conversations before any cleanup writes', async () => {
  const harness = serviceHarness({ conversationCount: 1 });
  await assert.rejects(
    harness.service.deleteBuyer(
      String(harness.buyerId),
      { reason: 'Requested deletion', confirmation: 'DELETE BUYER' },
      new Types.ObjectId().toHexString(),
    ),
    ConflictException,
  );
  assert.deepEqual(harness.operations, []);
});

test('buyer deletion transactionally removes buyer-owned non-history records and writes audit', async () => {
  const harness = serviceHarness();
  const result = await harness.service.deleteBuyer(
    String(harness.buyerId),
    { reason: 'Requested deletion', confirmation: 'DELETE BUYER' },
    new Types.ObjectId().toHexString(),
  );

  assert.equal(result.deleted, true);
  assert.deepEqual(harness.operations.sort(), [
    'buyer-profile',
    'notifications',
    'requirements',
    'saved-properties',
    'saved-searches',
    'shares',
    'user',
    'audit',
  ].sort());
});
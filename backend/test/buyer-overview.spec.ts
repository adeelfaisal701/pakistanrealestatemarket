import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Types } from 'mongoose';
import { BuyerService } from '../src/modules/buyer/buyer.service';

function query<T>(value: T) {
  const result: Record<string, unknown> = {
    select: () => result,
    lean: () => result,
    exec: async () => value,
  };
  return result;
}

test('buyer overview counts inquiry conversations, unread messages, and offers separately', async () => {
  const buyerId = new Types.ObjectId();
  const requirementIds = [new Types.ObjectId(), new Types.ObjectId()];
  let requirementFilter: Record<string, unknown> | undefined;
  let offerFilter: Record<string, unknown> | undefined;
  const service = new BuyerService(
    {} as never,
    {} as never,
    {} as never,
    {
      countDocuments: () => query(4),
    } as never,
    {
      countDocuments: () => query(2),
    } as never,
    {
      countDocuments: () => query(3),
    } as never,
    {} as never,
    {
      find: (filter: Record<string, unknown>) => {
        requirementFilter = filter;
        return query(requirementIds.map((_id) => ({ _id })));
      },
    } as never,
    {
      countDocuments: (filter: Record<string, unknown>) => {
        offerFilter = filter;
        return query(5);
      },
    } as never,
    {
      getBuyerConversationCount: async () => 6,
      getBuyerUnreadCount: async () => 2,
    } as never,
  );

  const result = await service.getOverview(String(buyerId));

  assert.equal(result.totalInquiries, 6);
  assert.equal(result.unreadMessages, 2);
  assert.equal(result.receivedOffers, 5);
  assert.deepEqual(requirementFilter?.buyerId, buyerId);
  assert.deepEqual(
    offerFilter?.requirementId && (offerFilter.requirementId as { $in: Types.ObjectId[] }).$in,
    requirementIds,
  );
  assert.equal('acceptedOffers' in result, false);
});

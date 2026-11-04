import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  BadRequestException,
  NotFoundException,
  ParseEnumPipe,
  type PipeTransform,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { CrmService } from '../src/modules/crm/crm.service';
import { UpdateLeadStatusDto } from '../src/modules/crm/dto/update-lead-status.dto';
import { LeadStatus } from '../src/modules/crm/schemas/lead.schema';

test('agent lead status update persists only the selected owned lead status', async () => {
  const leadId = new Types.ObjectId();
  const agentId = new Types.ObjectId();
  let filter: Record<string, unknown> | undefined;
  let update: Record<string, unknown> | undefined;
  let options: Record<string, unknown> | undefined;
  const updatedLead = { _id: leadId, status: LeadStatus.SITE_VISIT_SCHEDULED };
  const service = new CrmService({
    findOneAndUpdate: async (
      receivedFilter: Record<string, unknown>,
      receivedUpdate: Record<string, unknown>,
      receivedOptions: Record<string, unknown>,
    ) => {
      filter = receivedFilter;
      update = receivedUpdate;
      options = receivedOptions;
      return updatedLead;
    },
  } as never);

  const result = await service.updateLeadStatus(
    String(leadId),
    String(agentId),
    { status: LeadStatus.SITE_VISIT_SCHEDULED },
  );

  assert.equal(result, updatedLead);
  assert.deepEqual(filter, { _id: leadId, agentId });
  assert.deepEqual(update, { status: LeadStatus.SITE_VISIT_SCHEDULED });
  assert.deepEqual(options, { new: true });
});

test('agent cannot update another agent lead status', async () => {
  const leadId = new Types.ObjectId();
  const agentId = new Types.ObjectId();
  let filter: Record<string, unknown> | undefined;
  const service = new CrmService({
    findOneAndUpdate: async (receivedFilter: Record<string, unknown>) => {
      filter = receivedFilter;
      return null;
    },
  } as never);

  await assert.rejects(
    service.updateLeadStatus(String(leadId), String(agentId), {
      status: LeadStatus.CLOSED_WON,
    }),
    NotFoundException,
  );
  assert.deepEqual(filter, { _id: leadId, agentId });
});

test('Lost remains Lost after update and reload and stays distinct from Closed Won in counts', async () => {
  const leadId = new Types.ObjectId();
  const agentId = new Types.ObjectId();
  const otherAgentId = new Types.ObjectId();
  const records = [
    { _id: leadId, agentId, status: LeadStatus.NEGOTIATION },
    { _id: new Types.ObjectId(), agentId, status: LeadStatus.CLOSED_WON },
    { _id: new Types.ObjectId(), agentId: otherAgentId, status: LeadStatus.LOST },
  ];
  const model = {
    find: (filter: Record<string, unknown>) => {
      const results = records.filter((record) =>
        Object.entries(filter).every(([key, value]) => String(record[key as keyof typeof record]) === String(value)),
      );
      const query = {
        sort: () => query,
        limit: () => query,
        exec: async () => results,
        then: (resolve: (value: typeof results) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(results).then(resolve, reject),
      };
      return query;
    },
    findOneAndUpdate: async (
      filter: Record<string, unknown>,
      update: Record<string, unknown>,
    ) => {
      const record = records.find((item) =>
        Object.entries(filter).every(([key, value]) => String(item[key as keyof typeof item]) === String(value)),
      );
      if (!record) return null;
      Object.assign(record, update);
      return record;
    },
  };
  const service = new CrmService(model as never);

  const updated = await service.updateLeadStatus(String(leadId), String(agentId), {
    status: LeadStatus.LOST,
  });
  assert.equal(updated.status, LeadStatus.LOST);

  const reloaded = await service.getAgentLeads(String(agentId));
  assert.equal(reloaded.find((lead) => String(lead._id) === String(leadId))?.status, LeadStatus.LOST);

  const counts = await service.getCrmStats(String(agentId));
  assert.equal(counts.closedWon, 1);
  assert.equal(counts.lost, 1);
  assert.equal(counts.totalLeads, 2);
});

test('agent lead list is scoped by authenticated agent and requested status', async () => {
  const agentId = new Types.ObjectId();
  let filter: Record<string, unknown> | undefined;
  const service = new CrmService({
    find: (receivedFilter: Record<string, unknown>) => {
      filter = receivedFilter;
      return { sort: () => ({ exec: async () => [] }) };
    },
  } as never);

  await service.getAgentLeads(String(agentId), LeadStatus.LOST);
  assert.deepEqual(filter, { agentId, status: LeadStatus.LOST });
});

test('invalid lead statuses are rejected by update validation and status query parsing', async () => {
  const dto = new UpdateLeadStatusDto();
  dto.status = 'closed' as LeadStatus;
  const errors = await validate(dto);
  assert.ok(errors.some((error) => error.property === 'status'));

  const statusPipe: PipeTransform = new ParseEnumPipe(LeadStatus, { optional: true });
  await assert.rejects(
    statusPipe.transform('closed', {
      type: 'query',
      metatype: String,
      data: 'status',
    }),
    BadRequestException,
  );
  assert.equal(await statusPipe.transform(undefined, { type: 'query' }), undefined);
});

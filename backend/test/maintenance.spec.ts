import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { RegisterDto } from '../src/modules/auth/dto/register.dto';
import { ActiveTechnicianGuard } from '../src/modules/maintenance/active-technician.guard';
import { AdminMaintenanceController } from '../src/modules/maintenance/admin-maintenance.controller';
import { CustomerMaintenanceController } from '../src/modules/maintenance/customer-maintenance.controller';
import { MaintenanceService } from '../src/modules/maintenance/maintenance.service';
import { TechnicianJobsController } from '../src/modules/maintenance/technician-jobs.controller';
import {
  AssignmentStatus,
  MaintenanceStatus,
  QuotationStatus,
  TechnicianAvailability,
  canTransition,
} from '../src/modules/maintenance/maintenance.constants';
import { UserAccountStatus, UserRole } from '../src/modules/users/schemas/user.schema';

// ─────────────────────────── helpers ───────────────────────────

type Doc = Record<string, any>;

function getPath(doc: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (Array.isArray(value)) return value.map((item) => (item as Doc)?.[key]);
    return (value as Doc | undefined)?.[key];
  }, doc);
}

function matches(doc: Doc, filter: Doc): boolean {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$or') return (expected as Doc[]).some((sub) => matches(doc, sub));
    const actual = getPath(doc, key);
    if (Array.isArray(actual)) return actual.some((item) => String(item) === String(expected));
    if (expected === null) return actual == null;
    return String(actual) === String(expected);
  });
}

function setPath(doc: Doc, path: string, value: unknown) {
  const keys = path.split('.');
  let target = doc;
  for (const key of keys.slice(0, -1)) {
    target[key] = { ...(target[key] ?? {}) };
    target = target[key];
  }
  target[keys[keys.length - 1]] = value;
}

function query<T>(value: T) {
  const result: Record<string, unknown> = {
    select: () => result,
    sort: () => result,
    skip: () => result,
    limit: () => result,
    lean: () => result,
    exec: async () => value,
  };
  return result;
}

function createHarness(initial: Doc) {
  const store: Doc = { revision: 0, images: [], assignments: [], timeline: [], workNotes: [], payments: [], complaints: [], ...initial };
  const filters: Doc[] = [];
  const notifications: Array<{ userId?: string; admins?: boolean; type: string }> = [];
  const activity: Doc[] = [];
  let forceConflict = false;
  const technicianId = new Types.ObjectId();
  const technicianState = {
    user: { _id: technicianId, role: UserRole.TECHNICIAN, accountStatus: UserAccountStatus.ACTIVE, name: 'Tech One', phone: '03001112222', email: 't@example.test' } as Doc | null,
    profile: { userId: technicianId, isActive: true, availability: TechnicianAvailability.AVAILABLE, categories: ['plumbing'] } as Doc | null,
  };

  const requestModel = {
    findOne: (filter: Doc) => {
      filters.push(filter);
      return query(matches(store, filter) ? { ...store } : null);
    },
    findById: (id: unknown) => query(String(id) === String(store._id) ? { ...store } : null),
    findOneAndUpdate: (filter: Doc, update: Doc) => {
      filters.push(filter);
      if (forceConflict || !matches(store, filter)) return query(null);
      for (const [path, value] of Object.entries(update.$set ?? {})) setPath(store, path, value);
      for (const [path, value] of Object.entries(update.$push ?? {})) {
        const items = (value as Doc)?.$each ?? [value];
        store[path] = [...(store[path] ?? []), ...items];
      }
      for (const [path, value] of Object.entries(update.$inc ?? {})) store[path] = (store[path] ?? 0) + (value as number);
      return query({ ...store });
    },
  };
  const userModel = {
    findOne: (filter: Doc) => {
      if (technicianState.user && String(filter._id) === String(technicianId)) return query(technicianState.user);
      return query(null);
    },
    find: () => query(technicianState.user ? [technicianState.user] : []),
  };
  const profileModel = {
    findOne: () => query(technicianState.profile),
  };
  const activityModel = { create: async (doc: Doc) => { activity.push(doc); return doc; } };
  const notificationsService = {
    notifyUser: async (userId: unknown, input: { type: string }) => { notifications.push({ userId: String(userId), type: input.type }); },
    notifyAdmins: async (input: { type: string }) => { notifications.push({ admins: true, type: input.type }); },
  };
  const imageStorage = { read: async () => ({ buffer: Buffer.from('x'), contentType: 'image/jpeg' }), save: async () => ({}), discard: async () => undefined };

  const service = new MaintenanceService(
    requestModel as never,
    profileModel as never,
    userModel as never,
    activityModel as never,
    notificationsService as never,
    imageStorage as never,
  );
  return {
    service,
    store,
    filters,
    notifications,
    activity,
    technicianId,
    technicianState,
    setConflict: (value: boolean) => { forceConflict = value; },
  };
}

function baseRequest(overrides: Doc = {}): Doc {
  return {
    _id: new Types.ObjectId(),
    reference: 'GS-MR-261112-ABCDE',
    customerId: new Types.ObjectId(),
    contact: { name: 'Customer', phone: '03009998888', email: 'c@example.test' },
    title: 'Kitchen sink leaking',
    description: 'Water is leaking under the kitchen sink since morning.',
    category: 'plumbing',
    propertyType: 'house',
    address: { line: 'House 12, Street 4', area: 'Bahria Town', city: 'Lahore' },
    preferredTimeSlot: 'morning',
    status: MaintenanceStatus.UNDER_REVIEW,
    technicianId: null,
    hasOpenComplaint: false,
    ...overrides,
  };
}

function assignedTo(technicianId: Types.ObjectId, status: AssignmentStatus = AssignmentStatus.PENDING): Doc {
  return {
    _id: new Types.ObjectId(),
    technicianId,
    assignedBy: new Types.ObjectId(),
    assignedAt: new Date(),
    notes: 'Bring spare P-trap',
    status,
  };
}

function future(hours = 24) {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}

// ─────────────────────────── workflow map ───────────────────────────

test('workflow allows the documented happy-path transitions', () => {
  assert.equal(canTransition('admin', MaintenanceStatus.PENDING, MaintenanceStatus.UNDER_REVIEW), true);
  assert.equal(canTransition('system', MaintenanceStatus.UNDER_REVIEW, MaintenanceStatus.ASSIGNED), true);
  assert.equal(canTransition('system', MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE, MaintenanceStatus.ACCEPTED), true);
  assert.equal(canTransition('system', MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE, MaintenanceStatus.REJECTED), true);
  assert.equal(canTransition('system', MaintenanceStatus.REJECTED, MaintenanceStatus.RESCHEDULING), true);
  assert.equal(canTransition('system', MaintenanceStatus.RESCHEDULING, MaintenanceStatus.ASSIGNED), true);
  assert.equal(canTransition('technician', MaintenanceStatus.ACCEPTED, MaintenanceStatus.ON_THE_WAY), true);
  assert.equal(canTransition('technician', MaintenanceStatus.ON_THE_WAY, MaintenanceStatus.IN_PROGRESS), true);
  assert.equal(canTransition('customer', MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION, MaintenanceStatus.COMPLETED), true);
  assert.equal(canTransition('customer', MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION, MaintenanceStatus.DISPUTED), true);
});

test('workflow rejects invalid and privilege-escalating transitions', () => {
  assert.equal(canTransition('admin', MaintenanceStatus.PENDING, MaintenanceStatus.COMPLETED), false);
  assert.equal(canTransition('admin', MaintenanceStatus.UNDER_REVIEW, MaintenanceStatus.ASSIGNED), false, 'assignment only via assign endpoint');
  assert.equal(canTransition('admin', MaintenanceStatus.CANCELLED, MaintenanceStatus.UNDER_REVIEW), false);
  assert.equal(canTransition('technician', MaintenanceStatus.ACCEPTED, MaintenanceStatus.IN_PROGRESS), false);
  assert.equal(canTransition('technician', MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.COMPLETED), false);
  assert.equal(canTransition('technician', MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE, MaintenanceStatus.ASSIGNED), false);
  assert.equal(canTransition('customer', MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.CANCELLED), false);
  assert.equal(canTransition('customer', MaintenanceStatus.PENDING, MaintenanceStatus.COMPLETED), false);
  assert.equal(canTransition('admin', MaintenanceStatus.DISPUTED, MaintenanceStatus.COMPLETED), true, 'admin may resolve disputes');
});

// ─────────────────────────── role-based access ───────────────────────────

function rolesFor(target: object, method?: string): string[] | undefined {
  const handler = method ? (target as any).prototype[method] : undefined;
  return new Reflector().getAllAndOverride<string[]>(ROLES_KEY, [handler, target].filter(Boolean) as never);
}

function guardContext(user: Doc, controller: object, method: string) {
  return {
    getHandler: () => (controller as any).prototype[method],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as never;
}

test('controllers declare role restrictions for admin, technician and customer APIs', () => {
  assert.deepEqual(rolesFor(AdminMaintenanceController), [UserRole.ADMIN]);
  assert.deepEqual(rolesFor(TechnicianJobsController), [UserRole.TECHNICIAN]);
  assert.deepEqual(rolesFor(CustomerMaintenanceController, 'create'), [UserRole.BUYER]);
  assert.deepEqual(rolesFor(CustomerMaintenanceController, 'getImage'), [UserRole.BUYER, UserRole.TECHNICIAN, UserRole.ADMIN]);
});

test('RolesGuard blocks technicians from admin maintenance APIs and buyers from technician APIs', () => {
  const guard = new RolesGuard(new Reflector());
  assert.throws(
    () => guard.canActivate(guardContext({ id: 'x', role: UserRole.TECHNICIAN }, AdminMaintenanceController, 'assign')),
    ForbiddenException,
  );
  assert.throws(
    () => guard.canActivate(guardContext({ id: 'x', role: UserRole.BUYER }, TechnicianJobsController, 'accept')),
    ForbiddenException,
  );
  assert.throws(
    () => guard.canActivate(guardContext({ id: 'x', role: UserRole.TECHNICIAN }, CustomerMaintenanceController, 'create')),
    ForbiddenException,
  );
  assert.equal(
    guard.canActivate(guardContext({ id: 'x', role: UserRole.ADMIN }, AdminMaintenanceController, 'assign')),
    true,
  );
});

test('ActiveTechnicianGuard rejects deactivated technician profiles and non-technicians', async () => {
  const ctx = (user: Doc) => ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as never;
  const inactive = new ActiveTechnicianGuard({ findOne: () => query({ isActive: false }) } as never);
  await assert.rejects(inactive.canActivate(ctx({ id: String(new Types.ObjectId()), role: UserRole.TECHNICIAN })), ForbiddenException);
  const active = new ActiveTechnicianGuard({ findOne: () => query({ isActive: true }) } as never);
  assert.equal(await active.canActivate(ctx({ id: String(new Types.ObjectId()), role: UserRole.TECHNICIAN })), true);
  await assert.rejects(active.canActivate(ctx({ id: String(new Types.ObjectId()), role: UserRole.AGENT })), ForbiddenException);
});

test('public registration cannot self-assign the technician role', async () => {
  const dto = plainToInstance(RegisterDto, {
    name: 'Someone', email: 's@example.test', phone: '03001234567', password: 'Password123', role: 'technician',
  });
  const errors = await validate(dto);
  assert.ok(errors.some((error) => error.property === 'role'));
});

// ─────────────────────────── customer ownership ───────────────────────────

test('customer lookups are scoped to the authenticated owner and return 404 for others', async () => {
  const h = createHarness(baseRequest());
  const stranger = String(new Types.ObjectId());
  await assert.rejects(h.service.getCustomerRequest(stranger, String(h.store._id)), NotFoundException);
  assert.equal(String(h.filters[0].customerId), stranger);
  const view = await h.service.getCustomerRequest(String(h.store.customerId), String(h.store._id));
  assert.equal(view.reference, h.store.reference);
});

test('customer view hides internal notes, dispatch notes and technician identity before acceptance', async () => {
  const h = createHarness(baseRequest({ status: MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE }));
  h.store.technicianId = h.technicianId;
  h.store.assignments = [assignedTo(h.technicianId)];
  h.store.timeline = [
    { _id: new Types.ObjectId(), event: 'technician_assigned', actorRole: 'admin', internal: true, note: 'secret dispatch note', at: new Date() },
    { _id: new Types.ObjectId(), event: 'status_changed', actorRole: 'admin', internal: false, at: new Date() },
  ];
  h.store.workNotes = [{ _id: new Types.ObjectId(), note: 'internal admin', authorRole: 'admin', internal: true, createdAt: new Date() }];
  const view = await h.service.getCustomerRequest(String(h.store.customerId), String(h.store._id));
  const serialized = JSON.stringify(view);
  assert.equal(view.technician, null);
  assert.equal(view.technicianPending, true);
  assert.equal(serialized.includes('secret dispatch note'), false);
  assert.equal(serialized.includes('Bring spare P-trap'), false);
  assert.equal(serialized.includes('internal admin'), false);
  assert.equal('assignments' in view, false);
});

test('customers cannot cancel once work is under way', async () => {
  const h = createHarness(baseRequest({ status: MaintenanceStatus.IN_PROGRESS }));
  await assert.rejects(
    h.service.cancelByCustomer(String(h.store.customerId), String(h.store._id), 'changed my mind'),
    BadRequestException,
  );
});

// ─────────────────────────── technician restrictions ───────────────────────────

test('technicians cannot act on jobs that are not assigned to them', async () => {
  const h = createHarness(baseRequest({ status: MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE }));
  h.store.technicianId = h.technicianId;
  h.store.assignments = [assignedTo(h.technicianId)];
  const other = String(new Types.ObjectId());
  await assert.rejects(h.service.acceptJob(other, String(h.store._id)), NotFoundException);
  await assert.rejects(h.service.getTechnicianJob(other, String(h.store._id)), NotFoundException);
  assert.equal(h.store.status, MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE);
});

test('technician sees area only before acceptance and full address/contact after accepting', async () => {
  const h = createHarness(baseRequest({ status: MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE }));
  h.store.technicianId = h.technicianId;
  h.store.assignments = [assignedTo(h.technicianId)];
  const before = await h.service.getTechnicianJob(String(h.technicianId), String(h.store._id)) as Doc;
  assert.equal(before.address, null);
  assert.equal(before.contact, null);
  assert.equal(before.area, 'Bahria Town');

  const after = await h.service.acceptJob(String(h.technicianId), String(h.store._id)) as Doc;
  assert.equal(h.store.status, MaintenanceStatus.ACCEPTED);
  assert.equal(h.store.assignments[0].status, AssignmentStatus.ACCEPTED);
  assert.equal(after.address.line, 'House 12, Street 4');
  assert.equal(after.contact.phone, '03009998888');
  assert.ok(h.notifications.some((item) => item.userId === String(h.store.customerId)));
});

test('technician rejection records the reason, releases the job and alerts admins', async () => {
  const h = createHarness(baseRequest({ status: MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE }));
  h.store.technicianId = h.technicianId;
  h.store.assignments = [assignedTo(h.technicianId)];
  const view = await h.service.rejectJob(String(h.technicianId), String(h.store._id), 'Already booked that day') as Doc;
  assert.equal(h.store.status, MaintenanceStatus.REJECTED);
  assert.equal(h.store.technicianId, null);
  assert.equal(h.store.assignments[0].status, AssignmentStatus.REJECTED);
  assert.equal(h.store.assignments[0].rejectionReason, 'Already booked that day');
  assert.equal(view.isCurrent, false);
  assert.equal('contact' in view, false, 'released technician loses contact access');
  assert.ok(h.notifications.some((item) => item.admins && item.type === 'maintenance.technician_rejected'));
});

test('technician cannot skip workflow steps', async () => {
  const h = createHarness(baseRequest({ status: MaintenanceStatus.ACCEPTED }));
  h.store.technicianId = h.technicianId;
  h.store.assignments = [assignedTo(h.technicianId, AssignmentStatus.ACCEPTED)];
  await assert.rejects(
    h.service.technicianUpdateStatus(String(h.technicianId), String(h.store._id), { status: MaintenanceStatus.IN_PROGRESS }),
    BadRequestException,
  );
  await h.service.technicianUpdateStatus(String(h.technicianId), String(h.store._id), { status: MaintenanceStatus.ON_THE_WAY });
  assert.equal(h.store.status, MaintenanceStatus.ON_THE_WAY);
});

test('technician cannot start work while a quotation awaits customer approval', async () => {
  const h = createHarness(baseRequest({ status: MaintenanceStatus.ON_THE_WAY }));
  h.store.technicianId = h.technicianId;
  h.store.assignments = [assignedTo(h.technicianId, AssignmentStatus.ACCEPTED)];
  h.store.quotation = { status: QuotationStatus.SENT, total: 5000, version: 1 };
  await assert.rejects(
    h.service.technicianUpdateStatus(String(h.technicianId), String(h.store._id), { status: MaintenanceStatus.IN_PROGRESS }),
    /awaiting customer approval/,
  );
});

// ─────────────────────────── admin assignment ───────────────────────────

test('admin cannot assign before review, or assign an inactive / wrong-skill technician', async () => {
  const pending = createHarness(baseRequest({ status: MaintenanceStatus.PENDING }));
  await assert.rejects(
    pending.service.assignTechnician(String(new Types.ObjectId()), String(pending.store._id), {
      technicianId: String(pending.technicianId), scheduledVisitAt: future(),
    }),
    /Move it under review first/,
  );

  const inactive = createHarness(baseRequest());
  inactive.technicianState.profile!.isActive = false;
  await assert.rejects(
    inactive.service.assignTechnician(String(new Types.ObjectId()), String(inactive.store._id), {
      technicianId: String(inactive.technicianId), scheduledVisitAt: future(),
    }),
    /not active/,
  );

  const wrongSkill = createHarness(baseRequest({ category: 'electrical' }));
  await assert.rejects(
    wrongSkill.service.assignTechnician(String(new Types.ObjectId()), String(wrongSkill.store._id), {
      technicianId: String(wrongSkill.technicianId), scheduledVisitAt: future(),
    }),
    /not registered for Electrical/,
  );
});

test('admin assignment walks Under Review → Assigned → Awaiting Acceptance and audits it', async () => {
  const h = createHarness(baseRequest());
  const adminId = String(new Types.ObjectId());
  await h.service.assignTechnician(adminId, String(h.store._id), {
    technicianId: String(h.technicianId), scheduledVisitAt: future(), notes: 'Gate code 4411',
  });
  assert.equal(h.store.status, MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE);
  assert.equal(String(h.store.technicianId), String(h.technicianId));
  assert.equal(h.store.assignments.length, 1);
  const statuses = h.store.timeline.filter((event: Doc) => event.toStatus).map((event: Doc) => event.toStatus);
  assert.deepEqual(statuses, [MaintenanceStatus.ASSIGNED, MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE]);
  assert.equal(h.activity[0].actionType, 'maintenance.assign');
  assert.ok(h.notifications.some((item) => item.userId === String(h.technicianId) && item.type === 'maintenance.job_assigned'));
});

test('admin reassignment requires a reason and withdraws the previous technician', async () => {
  const previous = new Types.ObjectId();
  const h = createHarness(baseRequest({ status: MaintenanceStatus.ACCEPTED }));
  h.store.technicianId = previous;
  h.store.assignments = [assignedTo(previous, AssignmentStatus.ACCEPTED)];
  const adminId = String(new Types.ObjectId());
  await assert.rejects(
    h.service.assignTechnician(adminId, String(h.store._id), { technicianId: String(h.technicianId), scheduledVisitAt: future() }),
    /reason is required/,
  );
  await h.service.assignTechnician(adminId, String(h.store._id), {
    technicianId: String(h.technicianId), scheduledVisitAt: future(), reason: 'Previous technician fell ill',
  });
  assert.equal(h.store.assignments[0].status, AssignmentStatus.WITHDRAWN);
  assert.equal(h.store.assignments[1].status, AssignmentStatus.PENDING);
  assert.equal(h.store.status, MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE);
  assert.ok(h.store.timeline.some((event: Doc) => event.toStatus === MaintenanceStatus.RESCHEDULING));
  assert.equal(h.activity[0].actionType, 'maintenance.reassign');
  assert.ok(h.notifications.some((item) => item.userId === String(previous) && item.type === 'maintenance.job_withdrawn'));
});

test('admin reassignment after a rejection goes through Rescheduling', async () => {
  const h = createHarness(baseRequest({ status: MaintenanceStatus.REJECTED }));
  h.store.assignments = [{ ...assignedTo(new Types.ObjectId(), AssignmentStatus.REJECTED), rejectionReason: 'busy' }];
  await h.service.assignTechnician(String(new Types.ObjectId()), String(h.store._id), {
    technicianId: String(h.technicianId), scheduledVisitAt: future(),
  });
  const statuses = h.store.timeline.filter((event: Doc) => event.toStatus).map((event: Doc) => event.toStatus);
  assert.deepEqual(statuses, [
    MaintenanceStatus.RESCHEDULING,
    MaintenanceStatus.ASSIGNED,
    MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE,
  ]);
});

test('admin status endpoint rejects invalid transitions and requires reasons', async () => {
  const h = createHarness(baseRequest({ status: MaintenanceStatus.PENDING }));
  const adminId = String(new Types.ObjectId());
  await assert.rejects(
    h.service.adminUpdateStatus(adminId, String(h.store._id), { status: MaintenanceStatus.COMPLETED, reason: 'x' }),
    /Invalid transition/,
  );
  await assert.rejects(
    h.service.adminUpdateStatus(adminId, String(h.store._id), { status: MaintenanceStatus.CANCELLED }),
    /reason is required/,
  );
  await h.service.adminUpdateStatus(adminId, String(h.store._id), { status: MaintenanceStatus.UNDER_REVIEW });
  assert.equal(h.store.status, MaintenanceStatus.UNDER_REVIEW);
});

test('concurrent modification is detected through the revision check', async () => {
  const h = createHarness(baseRequest({ status: MaintenanceStatus.PENDING }));
  h.setConflict(true);
  await assert.rejects(
    h.service.adminUpdateStatus(String(new Types.ObjectId()), String(h.store._id), { status: MaintenanceStatus.UNDER_REVIEW }),
    ConflictException,
  );
});

// ─────────────────────────── quotations ───────────────────────────

test('quotation total is computed server-side and customer approval is required', async () => {
  const h = createHarness(baseRequest());
  const adminId = String(new Types.ObjectId());
  await h.service.upsertQuotation(adminId, String(h.store._id), {
    inspectionCharge: 500, laborCharge: 2000, materialCharge: 1500.5,
    additionalCharges: [{ label: 'Night visit', amount: 300 }], send: true,
  });
  assert.equal(h.store.quotation.total, 4300.5);
  assert.equal(h.store.quotation.status, QuotationStatus.SENT);
  assert.ok(h.notifications.some((item) => item.userId === String(h.store.customerId) && item.type === 'maintenance.quotation_sent'));

  const stranger = String(new Types.ObjectId());
  await assert.rejects(
    h.service.respondToQuotation(stranger, String(h.store._id), { decision: 'approve' }),
    NotFoundException,
  );
  await h.service.respondToQuotation(String(h.store.customerId), String(h.store._id), { decision: 'approve' });
  assert.equal(h.store.quotation.status, QuotationStatus.APPROVED);
  await assert.rejects(
    h.service.respondToQuotation(String(h.store.customerId), String(h.store._id), { decision: 'reject' }),
    /no quotation awaiting/,
  );
});

test('revising an approved quotation requires a reason and resets approval', async () => {
  const h = createHarness(baseRequest({ status: MaintenanceStatus.ACCEPTED }));
  h.store.quotation = { status: QuotationStatus.APPROVED, total: 1000, version: 1 };
  const adminId = String(new Types.ObjectId());
  const payload = { inspectionCharge: 0, laborCharge: 1500, materialCharge: 0, send: true };
  await assert.rejects(h.service.upsertQuotation(adminId, String(h.store._id), payload), /revision reason/);
  await h.service.upsertQuotation(adminId, String(h.store._id), { ...payload, revisionReason: 'Extra pipe replacement' });
  assert.equal(h.store.quotation.version, 2);
  assert.equal(h.store.quotation.status, QuotationStatus.SENT);
});

test('payments can only be recorded against an approved quotation and never above its total', async () => {
  const h = createHarness(baseRequest({ status: MaintenanceStatus.COMPLETED }));
  const adminId = String(new Types.ObjectId());
  h.store.quotation = { status: QuotationStatus.SENT, total: 1000, version: 1 };
  await assert.rejects(h.service.recordPayment(adminId, String(h.store._id), { amount: 500, method: 'cash' }), /approved quotation/);
  h.store.quotation.status = QuotationStatus.APPROVED;
  await h.service.recordPayment(adminId, String(h.store._id), { amount: 600, method: 'cash' });
  assert.equal(h.store.paymentStatus, 'partially_paid');
  await assert.rejects(h.service.recordPayment(adminId, String(h.store._id), { amount: 500, method: 'cash' }), /exceeds/);
  await h.service.recordPayment(adminId, String(h.store._id), { amount: 400, method: 'bank_transfer' });
  assert.equal(h.store.paymentStatus, 'paid');
});

// ─────────────────────────── completion verification ───────────────────────────

test('technician completion needs a full checklist and after photos; only the customer finalises', async () => {
  const h = createHarness(baseRequest({ status: MaintenanceStatus.IN_PROGRESS }));
  h.store.technicianId = h.technicianId;
  h.store.assignments = [assignedTo(h.technicianId, AssignmentStatus.ACCEPTED)];
  const tech = String(h.technicianId);
  const id = String(h.store._id);

  await assert.rejects(
    h.service.submitCompletion(tech, id, { checklist: [{ label: 'Tested', done: false }] }),
    /checklist/,
  );
  await assert.rejects(
    h.service.submitCompletion(tech, id, { checklist: [{ label: 'Tested', done: true }] }),
    /after-work photo/,
  );
  h.store.images = [{ _id: new Types.ObjectId(), kind: 'after', filename: 'a.jpg' }];
  await h.service.submitCompletion(tech, id, { checklist: [{ label: 'Tested', done: true }], summary: 'Replaced trap' });
  assert.equal(h.store.status, MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION);
  assert.notEqual(h.store.status, MaintenanceStatus.COMPLETED, 'technician cannot finalise');

  await assert.rejects(h.service.confirmCompletion(String(new Types.ObjectId()), id), NotFoundException);
  await h.service.confirmCompletion(String(h.store.customerId), id);
  assert.equal(h.store.status, MaintenanceStatus.COMPLETED);
  assert.equal(h.store.assignments[0].status, AssignmentStatus.COMPLETED);
  assert.ok(h.store.completedAt instanceof Date);

  await h.service.submitFeedback(String(h.store.customerId), id, { rating: 5, comment: 'Great' });
  assert.equal(h.store.feedback.rating, 5);
  await assert.rejects(h.service.submitFeedback(String(h.store.customerId), id, { rating: 4 }), ConflictException);
});

test('customer cannot confirm completion before the technician submits it', async () => {
  const h = createHarness(baseRequest({ status: MaintenanceStatus.IN_PROGRESS }));
  await assert.rejects(
    h.service.confirmCompletion(String(h.store.customerId), String(h.store._id)),
    /not awaiting your confirmation/,
  );
});

test('a complaint during confirmation disputes the job and alerts admins', async () => {
  const h = createHarness(baseRequest({ status: MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION }));
  await h.service.raiseComplaint(String(h.store.customerId), String(h.store._id), {
    subject: 'Still leaking', description: 'The sink still leaks after the visit.',
  });
  assert.equal(h.store.status, MaintenanceStatus.DISPUTED);
  assert.equal(h.store.hasOpenComplaint, true);
  assert.ok(h.notifications.some((item) => item.admins && item.type === 'maintenance.complaint_raised'));
});

// ─────────────────────────── image access ───────────────────────────

test('maintenance images are only served to the owner, current technician or admin', async () => {
  const imageId = new Types.ObjectId();
  const h = createHarness(baseRequest({ status: MaintenanceStatus.ACCEPTED }));
  h.store.technicianId = h.technicianId;
  h.store.images = [{ _id: imageId, kind: 'problem', filename: 'f.jpg' }];
  const id = String(h.store._id);
  await assert.rejects(
    h.service.readImage({ id: String(new Types.ObjectId()), role: UserRole.BUYER }, id, String(imageId)),
    NotFoundException,
  );
  await assert.rejects(
    h.service.readImage({ id: String(new Types.ObjectId()), role: UserRole.TECHNICIAN }, id, String(imageId)),
    NotFoundException,
  );
  await assert.rejects(
    h.service.readImage({ id: String(new Types.ObjectId()), role: UserRole.AGENT }, id, String(imageId)),
    NotFoundException,
  );
  assert.ok(await h.service.readImage({ id: String(h.store.customerId), role: UserRole.BUYER }, id, String(imageId)));
  assert.ok(await h.service.readImage({ id: String(h.technicianId), role: UserRole.TECHNICIAN }, id, String(imageId)));
  assert.ok(await h.service.readImage({ id: 'admin', role: UserRole.ADMIN }, id, String(imageId)));
});

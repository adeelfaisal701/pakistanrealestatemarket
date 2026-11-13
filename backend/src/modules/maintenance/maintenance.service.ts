import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { escapeRegExp } from '../../common/utils/escape-regexp';
import {
  AdminActivity,
  AdminActivityDocument,
} from '../admin/schemas/admin-activity.schema';
import { NotificationsService } from '../notifications/notifications.service';
import {
  User,
  UserAccountStatus,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';
import {
  AdminMaintenanceQueryDto,
  AdminStatusUpdateDto,
  AssignTechnicianDto,
  CompleteJobDto,
  ComplaintDto,
  CreateMaintenanceRequestDto,
  CustomerRequestsQueryDto,
  FeedbackDto,
  QuotationResponseDto,
  RecordPaymentDto,
  TechnicianJobsQueryDto,
  TechnicianStatusDto,
  UpdateComplaintDto,
  UpsertQuotationDto,
} from './dto/maintenance.dto';
import {
  ASSIGNABLE_STATUSES,
  AssignmentStatus,
  CUSTOMER_CANCELLABLE_STATUSES,
  ComplaintStatus,
  MAINTENANCE_CATEGORIES,
  MAX_IMAGES_PER_UPLOAD,
  MAX_PROBLEM_IMAGES,
  MAX_WORK_PHOTOS_PER_KIND,
  MaintenanceActorRole,
  MaintenanceStatus,
  PaymentStatus,
  QUOTATION_EDITABLE_STATUSES,
  QuotationStatus,
  STATUS_LABELS,
  TECHNICIAN_WORKING_STATUSES,
  TechnicianAvailability,
  canTransition,
  categoryLabel,
  isAdminExceptionTransition,
  isNormalTransition,
} from './maintenance.constants';
import {
  MaintenanceImageStorageService,
  UploadedMaintenanceImage,
} from './maintenance-image-storage.service';
import {
  MaintenanceAssignment,
  MaintenanceRequest,
  MaintenanceRequestDocument,
  MaintenanceTimelineEvent,
} from './schemas/maintenance-request.schema';
import {
  TechnicianProfile,
  TechnicianProfileDocument,
} from './schemas/technician-profile.schema';

export interface MaintenanceActor {
  id: string;
  role: string;
}

type RequestRecord = MaintenanceRequest & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

type MongoUpdate = {
  $set?: Record<string, unknown>;
  $push?: Record<string, unknown>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const POST_ACCEPTANCE_STATUSES: MaintenanceStatus[] = [
  MaintenanceStatus.ACCEPTED,
  MaintenanceStatus.ON_THE_WAY,
  MaintenanceStatus.IN_PROGRESS,
  MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION,
  MaintenanceStatus.COMPLETED,
  MaintenanceStatus.DISPUTED,
];

function oid(value: string | Types.ObjectId): Types.ObjectId {
  return new Types.ObjectId(String(value));
}

function sameId(a: unknown, b: unknown): boolean {
  return a != null && b != null && String(a) === String(b);
}

function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Core Property Care workflow: customer requests, admin dispatch, technician
 * job execution, quotations, payments records, feedback and complaints.
 *
 * Security model (enforced here, not only in controllers):
 *  - customers can only load requests where customerId === caller;
 *  - technicians can only load jobs where they are the current technician
 *    (full view) or a past assignee (minimal view without contact/address);
 *  - every state change is validated against the workflow map and committed
 *    with an optimistic revision check.
 */
@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectModel(MaintenanceRequest.name)
    private readonly requestModel: Model<MaintenanceRequestDocument>,
    @InjectModel(TechnicianProfile.name)
    private readonly profileModel: Model<TechnicianProfileDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(AdminActivity.name)
    private readonly activityModel: Model<AdminActivityDocument>,
    private readonly notifications: NotificationsService,
    private readonly imageStorage: MaintenanceImageStorageService,
  ) {}

  getCategories() {
    return MAINTENANCE_CATEGORIES.map(({ key, label, description }) => ({ key, label, description }));
  }

  // ═══════════════════════════ Customer ═══════════════════════════

  async createRequest(customerId: string, dto: CreateMaintenanceRequestDto) {
    const customer = await this.userModel
      .findOne({ _id: customerId, role: UserRole.BUYER })
      .select('name email phone')
      .lean()
      .exec();
    if (!customer) throw new ForbiddenException('Only customer accounts can submit maintenance requests.');

    const phone = (dto.contactPhone || customer.phone || '').replace(/[\s-]/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(phone)) {
      throw new BadRequestException('A valid contact phone number is required.');
    }
    const preferredVisitDate = this.parsePreferredDate(dto.preferredVisitDate);
    const now = new Date();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const created = await this.requestModel.create({
          reference: this.generateReference(now),
          customerId: oid(customerId),
          contact: {
            name: (dto.contactName || customer.name).trim(),
            phone,
            email: customer.email,
          },
          title: dto.title,
          description: dto.description,
          category: dto.category,
          propertyType: dto.propertyType,
          address: dto.address,
          preferredVisitDate,
          preferredTimeSlot: dto.preferredTimeSlot ?? 'anytime',
          status: MaintenanceStatus.PENDING,
          timeline: [
            this.event('request_submitted', 'customer', customerId, {
              toStatus: MaintenanceStatus.PENDING,
            }),
          ],
          revision: 0,
        });
        const id = String(created._id);
        await Promise.all([
          this.notifications.notifyAdmins({
            type: 'maintenance.request_submitted',
            title: 'New maintenance request',
            message: `${created.reference}: ${categoryLabel(dto.category)} — ${dto.title} (${dto.address.area}, ${dto.address.city}).`,
            link: `/admin/maintenance/requests/${id}`,
            entityType: 'maintenance_request',
            entityId: id,
            dedupeKey: `maintenance.request_submitted:${id}`,
          }),
          this.notifications.notifyUser(customerId, {
            type: 'maintenance.request_submitted',
            title: 'Request received',
            message: `Your request ${created.reference} was received. Our team will review it shortly.`,
            link: `/buyer/maintenance/${id}`,
            entityType: 'maintenance_request',
            entityId: id,
            dedupeKey: `maintenance.request_submitted:${id}`,
          }),
        ]);
        return this.toCustomerView(created.toObject() as RequestRecord);
      } catch (error) {
        if (this.isDuplicateKey(error) && attempt < 2) continue;
        throw error;
      }
    }
    throw new ConflictException('Could not allocate a request reference. Please try again.');
  }

  async listCustomerRequests(customerId: string, query: Partial<CustomerRequestsQueryDto> = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: Record<string, unknown> = { customerId: oid(customerId) };
    if (query.scope === 'completed') filter.status = MaintenanceStatus.COMPLETED;
    else if (query.scope === 'cancelled') filter.status = MaintenanceStatus.CANCELLED;
    else if (query.scope === 'active') {
      filter.status = { $nin: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED] };
    }
    const [items, total] = await Promise.all([
      this.requestModel
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.requestModel.countDocuments(filter).exec(),
    ]);
    return {
      items: (items as RequestRecord[]).map((item) => this.toListItem(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCustomerRequest(customerId: string, id: string) {
    const request = await this.findCustomerRequest(customerId, id);
    return this.toCustomerView(request, await this.loadTechnicianContact(request));
  }

  async uploadProblemImages(customerId: string, id: string, files: UploadedMaintenanceImage[]) {
    const request = await this.findCustomerRequest(customerId, id);
    if (![MaintenanceStatus.PENDING, MaintenanceStatus.UNDER_REVIEW].includes(request.status)) {
      throw new BadRequestException('Problem photos can only be added before a technician is assigned.');
    }
    const existing = request.images.filter((image) => image.kind === 'problem').length;
    this.assertUploadCount(files, existing, MAX_PROBLEM_IMAGES, 'problem photos');
    const saved = await this.saveImages(files, 'problem', customerId);
    try {
      const updated = await this.commit(request, {
        $push: { images: { $each: saved } },
      }, [this.event('problem_photos_added', 'customer', customerId, { note: `${saved.length} photo(s) added` })]);
      return this.toCustomerView(updated, await this.loadTechnicianContact(updated));
    } catch (error) {
      await Promise.all(saved.map((image) => this.imageStorage.discard(image.filename)));
      throw error;
    }
  }

  async cancelByCustomer(customerId: string, id: string, reason?: string) {
    const request = await this.findCustomerRequest(customerId, id);
    if (!CUSTOMER_CANCELLABLE_STATUSES.includes(request.status)) {
      throw new BadRequestException(
        'This request can no longer be cancelled online. Please raise a complaint or contact support.',
      );
    }
    const updated = await this.applyStatusChange(request, MaintenanceStatus.CANCELLED, 'customer', customerId, {
      note: reason || 'Cancelled by customer',
      extraSet: { cancellationReason: reason || 'Cancelled by customer' },
      withdrawAssignmentReason: 'Request cancelled by customer',
    });
    await this.notifyStatusChange(updated, request.status, request.technicianId);
    return this.toCustomerView(updated);
  }

  async respondToQuotation(customerId: string, id: string, dto: QuotationResponseDto) {
    const request = await this.findCustomerRequest(customerId, id);
    if (!request.quotation || request.quotation.status !== QuotationStatus.SENT) {
      throw new BadRequestException('There is no quotation awaiting your approval.');
    }
    if (request.status === MaintenanceStatus.CANCELLED || request.status === MaintenanceStatus.COMPLETED) {
      throw new BadRequestException('This request is closed.');
    }
    const approved = dto.decision === 'approve';
    const updated = await this.commit(request, {
      $set: {
        'quotation.status': approved ? QuotationStatus.APPROVED : QuotationStatus.REJECTED,
        'quotation.respondedAt': new Date(),
        'quotation.customerNote': dto.note,
      },
    }, [
      this.event(approved ? 'quotation_approved' : 'quotation_rejected', 'customer', customerId, {
        note: dto.note || `Quotation v${request.quotation.version} ${approved ? 'approved' : 'rejected'}`,
      }),
    ]);
    const key = `${approved ? 'approved' : 'rejected'}:${String(request._id)}:v${request.quotation.version}`;
    await this.notifications.notifyAdmins({
      type: approved ? 'maintenance.quotation_approved' : 'maintenance.quotation_rejected',
      title: approved ? 'Quotation approved' : 'Quotation rejected',
      message: `${request.reference}: the customer ${approved ? 'approved' : 'rejected'} the quotation (PKR ${request.quotation.total.toLocaleString('en-PK')}).`,
      link: `/admin/maintenance/requests/${String(request._id)}`,
      entityType: 'maintenance_request',
      entityId: String(request._id),
      dedupeKey: `maintenance.quotation_${key}`,
    });
    if (approved && request.technicianId) {
      await this.notifications.notifyUser(request.technicianId, {
        type: 'maintenance.quotation_approved',
        title: 'Quotation approved',
        message: `${request.reference}: the customer approved the quotation. You can proceed with the work.`,
        link: `/technician/jobs/${String(request._id)}`,
        entityType: 'maintenance_request',
        entityId: String(request._id),
        dedupeKey: `maintenance.quotation_${key}`,
      });
    }
    return this.toCustomerView(updated, await this.loadTechnicianContact(updated));
  }

  async confirmCompletion(customerId: string, id: string) {
    const request = await this.findCustomerRequest(customerId, id);
    if (!canTransition('customer', request.status, MaintenanceStatus.COMPLETED)) {
      throw new BadRequestException('This job is not awaiting your confirmation.');
    }
    const updated = await this.applyStatusChange(request, MaintenanceStatus.COMPLETED, 'customer', customerId, {
      note: 'Customer confirmed the work is complete',
      extraSet: { completedAt: new Date() },
      completeAssignment: true,
    });
    await this.notifyStatusChange(updated, request.status, request.technicianId);
    return this.toCustomerView(updated, await this.loadTechnicianContact(updated));
  }

  async submitFeedback(customerId: string, id: string, dto: FeedbackDto) {
    const request = await this.findCustomerRequest(customerId, id);
    if (request.status !== MaintenanceStatus.COMPLETED) {
      throw new BadRequestException('Feedback can be submitted after the job is completed.');
    }
    if (request.feedback) throw new ConflictException('Feedback has already been submitted for this job.');
    const updated = await this.commit(request, {
      $set: {
        feedback: {
          rating: dto.rating,
          comment: dto.comment,
          technicianId: request.technicianId ?? undefined,
          createdAt: new Date(),
        },
      },
    }, [this.event('feedback_submitted', 'customer', customerId, { note: `Rated ${dto.rating}/5` })]);
    await this.notifications.notifyAdmins({
      type: 'maintenance.feedback_submitted',
      title: 'Customer feedback received',
      message: `${request.reference}: rated ${dto.rating}/5.`,
      link: `/admin/maintenance/requests/${String(request._id)}`,
      entityType: 'maintenance_request',
      entityId: String(request._id),
      dedupeKey: `maintenance.feedback:${String(request._id)}`,
    });
    return this.toCustomerView(updated, await this.loadTechnicianContact(updated));
  }

  async raiseComplaint(customerId: string, id: string, dto: ComplaintDto) {
    const request = await this.findCustomerRequest(customerId, id);
    if (request.status === MaintenanceStatus.CANCELLED) {
      throw new BadRequestException('Complaints cannot be raised on a cancelled request.');
    }
    if (request.complaints.length >= 5) {
      throw new BadRequestException('Too many complaints on this request. Please contact support.');
    }
    const complaint = {
      _id: new Types.ObjectId(),
      subject: dto.subject,
      description: dto.description,
      status: ComplaintStatus.OPEN,
      createdAt: new Date(),
    };
    const disputes =
      request.status === MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION ||
      request.status === MaintenanceStatus.COMPLETED;
    let updated: RequestRecord;
    if (disputes) {
      updated = await this.applyStatusChange(request, MaintenanceStatus.DISPUTED, 'customer', customerId, {
        note: `Complaint raised: ${dto.subject}`,
        extraSet: { hasOpenComplaint: true },
        extraPush: { complaints: complaint },
      });
      await this.notifyStatusChange(updated, request.status, request.technicianId);
    } else {
      updated = await this.commit(request, {
        $set: { hasOpenComplaint: true },
        $push: { complaints: complaint },
      }, [this.event('complaint_raised', 'customer', customerId, { note: dto.subject })]);
    }
    await this.notifications.notifyAdmins({
      type: 'maintenance.complaint_raised',
      title: 'Complaint raised',
      message: `${request.reference}: ${dto.subject}`,
      link: `/admin/maintenance/requests/${String(request._id)}`,
      entityType: 'maintenance_request',
      entityId: String(request._id),
      dedupeKey: `maintenance.complaint:${String(complaint._id)}`,
    });
    return this.toCustomerView(updated, await this.loadTechnicianContact(updated));
  }

  // ═══════════════════════════ Technician ═══════════════════════════

  async getTechnicianProfile(technicianId: string) {
    const [user, profile] = await Promise.all([
      this.userModel.findOne({ _id: technicianId, role: UserRole.TECHNICIAN }).select('name email phone').lean().exec(),
      this.profileModel.findOne({ userId: oid(technicianId) }).lean().exec(),
    ]);
    if (!user || !profile) throw new NotFoundException('Technician profile not found.');
    return {
      id: technicianId,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      categories: profile.categories,
      skills: profile.skills,
      serviceAreas: profile.serviceAreas,
      city: profile.city,
      availability: profile.availability,
      isActive: profile.isActive,
    };
  }

  technicianBucketFilter(technicianId: string, bucket?: string): Record<string, unknown> {
    const me = oid(technicianId);
    switch (bucket) {
      case 'new':
        return { technicianId: me, status: MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE };
      case 'accepted':
        return { technicianId: me, status: MaintenanceStatus.ACCEPTED };
      case 'in_progress':
        return {
          technicianId: me,
          status: { $in: [MaintenanceStatus.ON_THE_WAY, MaintenanceStatus.IN_PROGRESS] },
        };
      case 'completed':
        return {
          technicianId: me,
          status: {
            $in: [
              MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION,
              MaintenanceStatus.COMPLETED,
              MaintenanceStatus.DISPUTED,
            ],
          },
        };
      case 'rejected':
        return {
          assignments: {
            $elemMatch: {
              technicianId: me,
              status: { $in: [AssignmentStatus.REJECTED, AssignmentStatus.WITHDRAWN] },
            },
          },
        };
      default:
        return { $or: [{ technicianId: me }, { 'assignments.technicianId': me }] };
    }
  }

  async listTechnicianJobs(technicianId: string, query: Partial<TechnicianJobsQueryDto> = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const bucket = query.bucket ?? 'new';
    const filter = this.technicianBucketFilter(technicianId, bucket);
    const buckets = ['new', 'accepted', 'in_progress', 'completed', 'rejected'];
    const [items, total, ...counts] = await Promise.all([
      this.requestModel
        .find(filter)
        .sort({ scheduledVisitAt: 1, updatedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.requestModel.countDocuments(filter).exec(),
      ...buckets.map((name) =>
        this.requestModel.countDocuments(this.technicianBucketFilter(technicianId, name)).exec(),
      ),
    ]);
    return {
      items: (items as RequestRecord[]).map((item) => this.toTechnicianView(item, technicianId)),
      counts: Object.fromEntries(buckets.map((name, index) => [name, counts[index]])),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTechnicianJob(technicianId: string, id: string) {
    const request = await this.findTechnicianJob(technicianId, id, false);
    return this.toTechnicianView(request, technicianId);
  }

  async acceptJob(technicianId: string, id: string) {
    const request = await this.findTechnicianJob(technicianId, id, true);
    if (request.status !== MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE) {
      throw new BadRequestException('This job is not awaiting your acceptance.');
    }
    const updated = await this.applyStatusChange(request, MaintenanceStatus.ACCEPTED, 'technician', technicianId, {
      note: 'Technician accepted the job',
      assignmentUpdate: { status: AssignmentStatus.ACCEPTED, respondedAt: new Date() },
    });
    await this.notifyStatusChange(updated, request.status, request.technicianId);
    return this.toTechnicianView(updated, technicianId);
  }

  async rejectJob(technicianId: string, id: string, reason: string) {
    const request = await this.findTechnicianJob(technicianId, id, true);
    if (request.status !== MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE) {
      throw new BadRequestException('Only jobs awaiting your acceptance can be rejected.');
    }
    const updated = await this.applyStatusChange(request, MaintenanceStatus.REJECTED, 'technician', technicianId, {
      note: reason,
      internal: true,
      assignmentUpdate: {
        status: AssignmentStatus.REJECTED,
        respondedAt: new Date(),
        rejectionReason: reason,
      },
      extraSet: { technicianId: null },
    });
    await this.notifications.notifyAdmins({
      type: 'maintenance.technician_rejected',
      title: 'Technician rejected a job',
      message: `${request.reference}: the technician rejected the assignment — ${reason}. Reassignment needed.`,
      link: `/admin/maintenance/requests/${String(request._id)}`,
      entityType: 'maintenance_request',
      entityId: String(request._id),
      dedupeKey: `maintenance.technician_rejected:${String(request._id)}:${updated.revision}`,
    });
    return this.toTechnicianView(updated, technicianId);
  }

  async technicianUpdateStatus(technicianId: string, id: string, dto: TechnicianStatusDto) {
    const request = await this.findTechnicianJob(technicianId, id, true);
    if (!canTransition('technician', request.status, dto.status)) {
      throw new BadRequestException(
        `Cannot move a job from ${STATUS_LABELS[request.status]} to ${STATUS_LABELS[dto.status]}.`,
      );
    }
    if (
      dto.status === MaintenanceStatus.IN_PROGRESS &&
      request.quotation &&
      [QuotationStatus.SENT, QuotationStatus.REJECTED].includes(request.quotation.status)
    ) {
      throw new BadRequestException(
        'The quotation for this job is awaiting customer approval. Wait for approval before starting work.',
      );
    }
    const updated = await this.applyStatusChange(request, dto.status, 'technician', technicianId, {
      note: dto.note,
    });
    await this.notifyStatusChange(updated, request.status, request.technicianId);
    return this.toTechnicianView(updated, technicianId);
  }

  async uploadWorkPhotos(
    technicianId: string,
    id: string,
    kind: 'before' | 'after',
    files: UploadedMaintenanceImage[],
  ) {
    const request = await this.findTechnicianJob(technicianId, id, true);
    if (!TECHNICIAN_WORKING_STATUSES.includes(request.status)) {
      throw new BadRequestException('Work photos can be uploaded only while the job is active.');
    }
    const existing = request.images.filter((image) => image.kind === kind).length;
    this.assertUploadCount(files, existing, MAX_WORK_PHOTOS_PER_KIND, `${kind}-work photos`);
    const saved = await this.saveImages(files, kind, technicianId);
    try {
      const updated = await this.commit(request, {
        $push: { images: { $each: saved } },
      }, [this.event(`${kind}_photos_added`, 'technician', technicianId, { note: `${saved.length} ${kind}-work photo(s)` })]);
      return this.toTechnicianView(updated, technicianId);
    } catch (error) {
      await Promise.all(saved.map((image) => this.imageStorage.discard(image.filename)));
      throw error;
    }
  }

  async addTechnicianNote(technicianId: string, id: string, note: string) {
    const request = await this.findTechnicianJob(technicianId, id, true);
    if (!TECHNICIAN_WORKING_STATUSES.includes(request.status)) {
      throw new BadRequestException('Work notes can be added only while the job is active.');
    }
    if (request.workNotes.length >= 100) throw new BadRequestException('Note limit reached for this job.');
    const updated = await this.commit(request, {
      $push: {
        workNotes: {
          _id: new Types.ObjectId(),
          authorId: oid(technicianId),
          authorRole: 'technician',
          note,
          internal: false,
          createdAt: new Date(),
        },
      },
    }, []);
    return this.toTechnicianView(updated, technicianId);
  }

  async submitCompletion(technicianId: string, id: string, dto: CompleteJobDto) {
    const request = await this.findTechnicianJob(technicianId, id, true);
    if (
      request.status !== MaintenanceStatus.IN_PROGRESS ||
      !isNormalTransition(request.status, MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION)
    ) {
      throw new BadRequestException('Only jobs in progress can be submitted for completion.');
    }
    const incomplete = dto.checklist.filter((item) => !item.done).map((item) => item.label);
    if (incomplete.length) {
      throw new BadRequestException(`Complete every checklist item first: ${incomplete.join(', ')}.`);
    }
    if (!request.images.some((image) => image.kind === 'after')) {
      throw new BadRequestException('Upload at least one after-work photo before submitting completion.');
    }
    const updated = await this.applyStatusChange(
      request,
      MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION,
      'technician',
      technicianId,
      {
        note: dto.summary || 'Technician submitted the job for verification',
        extraSet: {
          completionReport: {
            checklist: dto.checklist,
            summary: dto.summary,
            submittedBy: oid(technicianId),
            submittedAt: new Date(),
          },
        },
      },
    );
    await this.notifyStatusChange(updated, request.status, request.technicianId);
    return this.toTechnicianView(updated, technicianId);
  }

  // ═══════════════════════════ Shared image access ═══════════════════════════

  async readImage(actor: MaintenanceActor, id: string, imageId: string) {
    const request = (await this.requestModel
      .findById(id)
      .select('customerId technicianId images')
      .lean()
      .exec()) as RequestRecord | null;
    if (!request) throw new NotFoundException('Image not found.');
    const allowed =
      actor.role === UserRole.ADMIN ||
      (actor.role === UserRole.BUYER && sameId(request.customerId, actor.id)) ||
      (actor.role === UserRole.TECHNICIAN && sameId(request.technicianId, actor.id));
    if (!allowed) throw new NotFoundException('Image not found.');
    const image = request.images.find((item) => sameId(item._id, imageId));
    if (!image) throw new NotFoundException('Image not found.');
    return this.imageStorage.read(image.filename);
  }

  // ═══════════════════════════ Admin ═══════════════════════════

  async getAdminOverview() {
    const [grouped, openComplaints, total, recent, technicianCounts] = await Promise.all([
      this.requestModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      this.requestModel.countDocuments({ hasOpenComplaint: true }).exec(),
      this.requestModel.countDocuments({}).exec(),
      this.requestModel.find({}).sort({ createdAt: -1 }).limit(6).lean().exec(),
      this.profileModel.aggregate<{ _id: { active: boolean; availability: string }; count: number }>([
        { $group: { _id: { active: '$isActive', availability: '$availability' }, count: { $sum: 1 } } },
      ]).exec(),
    ]);
    const byStatus = Object.fromEntries(grouped.map((row) => [row._id, row.count])) as Record<string, number>;
    const count = (...statuses: MaintenanceStatus[]) =>
      statuses.reduce((sum, status) => sum + (byStatus[status] ?? 0), 0);
    const activeTechnicians = technicianCounts
      .filter((row) => row._id.active)
      .reduce((sum, row) => sum + row.count, 0);
    const availableTechnicians = technicianCounts
      .filter((row) => row._id.active && row._id.availability === TechnicianAvailability.AVAILABLE)
      .reduce((sum, row) => sum + row.count, 0);
    return {
      stats: {
        total,
        pending: count(MaintenanceStatus.PENDING),
        underReview: count(MaintenanceStatus.UNDER_REVIEW),
        awaitingAcceptance: count(MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE),
        assigned: count(MaintenanceStatus.ASSIGNED, MaintenanceStatus.ACCEPTED),
        needsReassignment: count(MaintenanceStatus.REJECTED, MaintenanceStatus.RESCHEDULING),
        inProgress: count(MaintenanceStatus.ON_THE_WAY, MaintenanceStatus.IN_PROGRESS),
        awaitingConfirmation: count(MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION),
        completed: count(MaintenanceStatus.COMPLETED),
        cancelled: count(MaintenanceStatus.CANCELLED),
        disputed: count(MaintenanceStatus.DISPUTED),
        openComplaints,
      },
      byStatus,
      technicians: { active: activeTechnicians, available: availableTechnicians },
      recent: (recent as RequestRecord[]).map((item) => this.toListItem(item, true)),
    };
  }

  async listAdminRequests(query: Partial<AdminMaintenanceQueryDto> = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const filter: Record<string, unknown> = {};
    if (query.status && query.status !== 'all') filter.status = query.status;
    if (query.category && query.category !== 'all') filter.category = query.category;
    if (query.openComplaints === 'true') filter.hasOpenComplaint = true;
    const and: Record<string, unknown>[] = [];
    if (query.location?.trim()) {
      const regex = new RegExp(escapeRegExp(query.location.trim()), 'i');
      and.push({ $or: [{ 'address.area': regex }, { 'address.city': regex }, { 'address.line': regex }] });
    }
    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegExp(query.search.trim()), 'i');
      and.push({
        $or: [
          { reference: regex },
          { title: regex },
          { 'contact.name': regex },
          { 'contact.phone': regex },
        ],
      });
    }
    if (query.from || query.to) {
      const createdAt: Record<string, Date> = {};
      if (query.from) createdAt.$gte = new Date(query.from);
      if (query.to) {
        const to = new Date(query.to);
        if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) to.setUTCHours(23, 59, 59, 999);
        createdAt.$lte = to;
      }
      filter.createdAt = createdAt;
    }
    if (and.length) filter.$and = and;
    const [items, total] = await Promise.all([
      this.requestModel
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.requestModel.countDocuments(filter).exec(),
    ]);
    const records = items as RequestRecord[];
    const technicians = await this.loadUsers(records.map((item) => item.technicianId).filter(Boolean));
    return {
      items: records.map((item) => ({
        ...this.toListItem(item, true),
        technician: item.technicianId ? technicians.get(String(item.technicianId)) ?? null : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAdminRequest(id: string) {
    const request = await this.findById(id);
    return this.toAdminView(request);
  }

  async adminUpdateStatus(adminId: string, id: string, dto: AdminStatusUpdateDto) {
    const request = await this.findById(id);
    if (!canTransition('admin', request.status, dto.status)) {
      throw new BadRequestException(
        `Invalid transition from ${STATUS_LABELS[request.status]} to ${STATUS_LABELS[dto.status] ?? dto.status}.` +
          (dto.status === MaintenanceStatus.ASSIGNED ||
          dto.status === MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE
            ? ' Use the technician assignment action instead.'
            : ''),
      );
    }
    if (dto.status !== MaintenanceStatus.UNDER_REVIEW && !dto.reason?.trim()) {
      throw new BadRequestException('A reason is required for this status change.');
    }
    if (dto.status === MaintenanceStatus.IN_PROGRESS && !request.technicianId) {
      throw new BadRequestException('A technician must be assigned before work can resume.');
    }
    const exceptional = isAdminExceptionTransition(request.status, dto.status);
    const extraSet: Record<string, unknown> = {};
    const options: StatusChangeOptions = {
      note: dto.reason || 'Request moved under review',
      extraSet,
    };
    if (dto.status === MaintenanceStatus.CANCELLED) {
      extraSet.cancellationReason = dto.reason;
      options.withdrawAssignmentReason = dto.reason;
    } else if (dto.status === MaintenanceStatus.RESCHEDULING) {
      options.withdrawAssignmentReason = dto.reason;
    } else if (dto.status === MaintenanceStatus.COMPLETED) {
      extraSet.completedAt = new Date();
      options.completeAssignment = true;
    }
    const updated = await this.applyStatusChange(request, dto.status, 'admin', adminId, options);
    await this.logAdmin(adminId, exceptional ? 'maintenance.status_override' : 'maintenance.status_change', String(request._id), {
      previousStatus: request.status,
      newStatus: dto.status,
      reason: dto.reason,
      metadata: { reference: request.reference },
    });
    await this.notifyStatusChange(updated, request.status, request.technicianId);
    return this.toAdminView(updated);
  }

  async assignTechnician(adminId: string, id: string, dto: AssignTechnicianDto) {
    const request = await this.findById(id);
    if (!ASSIGNABLE_STATUSES.includes(request.status)) {
      throw new BadRequestException(
        `A technician cannot be assigned while the request is ${STATUS_LABELS[request.status]}.` +
          (request.status === MaintenanceStatus.PENDING ? ' Move it under review first.' : ''),
      );
    }
    const replacing = Boolean(request.technicianId);
    if (replacing && sameId(request.technicianId, dto.technicianId)) {
      throw new ConflictException('This technician is already assigned to the request.');
    }
    if (replacing && !dto.reason?.trim()) {
      throw new BadRequestException('A reason is required when reassigning a job.');
    }
    const scheduledVisitAt = new Date(dto.scheduledVisitAt);
    const now = Date.now();
    if (Number.isNaN(scheduledVisitAt.getTime()) || scheduledVisitAt.getTime() < now - 15 * 60 * 1000) {
      throw new BadRequestException('The scheduled visit must be in the future.');
    }
    if (scheduledVisitAt.getTime() > now + 120 * DAY_MS) {
      throw new BadRequestException('The scheduled visit must be within the next 120 days.');
    }
    await this.assertAssignableTechnician(dto.technicianId, request.category);

    const at = new Date();
    const previousTechnicianId = request.technicianId ? String(request.technicianId) : null;
    const assignments = request.assignments.map((assignment) => {
      if (
        [AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED].includes(assignment.status) &&
        sameId(assignment.technicianId, previousTechnicianId)
      ) {
        return { ...assignment, status: AssignmentStatus.WITHDRAWN, withdrawnReason: dto.reason };
      }
      return assignment;
    });
    assignments.push({
      _id: new Types.ObjectId(),
      technicianId: oid(dto.technicianId),
      assignedBy: oid(adminId),
      assignedAt: at,
      scheduledVisitAt,
      notes: dto.notes,
      status: AssignmentStatus.PENDING,
    } as MaintenanceAssignment);

    // Walk the validated workflow so the audit trail shows every step.
    const path: MaintenanceStatus[] = [];
    if (request.status !== MaintenanceStatus.UNDER_REVIEW && request.status !== MaintenanceStatus.RESCHEDULING) {
      path.push(MaintenanceStatus.RESCHEDULING);
    }
    path.push(MaintenanceStatus.ASSIGNED, MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE);
    let from = request.status;
    const events: MaintenanceTimelineEvent[] = [];
    for (const to of path) {
      if (!isNormalTransition(from, to) && !isAdminExceptionTransition(from, to)) {
        throw new BadRequestException(`Invalid transition from ${STATUS_LABELS[from]} to ${STATUS_LABELS[to]}.`);
      }
      events.push(this.event('status_changed', 'admin', adminId, {
        fromStatus: from,
        toStatus: to,
        note: to === MaintenanceStatus.RESCHEDULING ? dto.reason : undefined,
      }));
      from = to;
    }
    events.push(this.event(replacing ? 'technician_reassigned' : 'technician_assigned', 'admin', adminId, {
      note: dto.notes ? `Dispatch note: ${dto.notes}` : undefined,
      internal: true,
    }));

    const updated = await this.commit(request, {
      $set: {
        status: MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE,
        technicianId: oid(dto.technicianId),
        scheduledVisitAt,
        assignments,
      },
    }, events);

    await this.logAdmin(adminId, replacing ? 'maintenance.reassign' : 'maintenance.assign', String(request._id), {
      previousStatus: request.status,
      newStatus: MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE,
      reason: dto.reason,
      metadata: {
        reference: request.reference,
        technicianId: dto.technicianId,
        previousTechnicianId,
        scheduledVisitAt: scheduledVisitAt.toISOString(),
      },
    });
    const requestId = String(request._id);
    await Promise.all([
      this.notifications.notifyUser(dto.technicianId, {
        type: 'maintenance.job_assigned',
        title: 'New job assigned',
        message: `${request.reference}: ${categoryLabel(request.category)} in ${request.address.area}. Please accept or reject.`,
        link: `/technician/jobs/${requestId}`,
        entityType: 'maintenance_request',
        entityId: requestId,
        dedupeKey: `maintenance.job_assigned:${requestId}:${updated.revision}`,
      }),
      previousTechnicianId
        ? this.notifications.notifyUser(previousTechnicianId, {
          type: 'maintenance.job_withdrawn',
          title: 'Job reassigned',
          message: `${request.reference} has been reassigned by Ghar Safar operations.`,
          link: `/technician/jobs/${requestId}`,
          entityType: 'maintenance_request',
          entityId: requestId,
          dedupeKey: `maintenance.job_withdrawn:${requestId}:${updated.revision}`,
        })
        : Promise.resolve(),
      this.notifications.notifyUser(request.customerId, {
        type: replacing ? 'maintenance.job_reassigned' : 'maintenance.job_assigned',
        title: replacing ? 'Technician being reassigned' : 'Technician assigned',
        message: `${request.reference}: a Ghar Safar technician has been ${replacing ? 'reassigned' : 'assigned'} and is confirming the visit.`,
        link: `/buyer/maintenance/${requestId}`,
        entityType: 'maintenance_request',
        entityId: requestId,
        dedupeKey: `maintenance.customer_assignment:${requestId}:${updated.revision}`,
      }),
    ]);
    return this.toAdminView(updated);
  }

  async upsertQuotation(adminId: string, id: string, dto: UpsertQuotationDto) {
    const request = await this.findById(id);
    if (!QUOTATION_EDITABLE_STATUSES.includes(request.status)) {
      throw new BadRequestException(`Quotations cannot be changed while the request is ${STATUS_LABELS[request.status]}.`);
    }
    const existing = request.quotation;
    const revisingApproved = existing?.status === QuotationStatus.APPROVED;
    if (revisingApproved && !dto.revisionReason?.trim()) {
      throw new BadRequestException('A revision reason is required to change an approved quotation.');
    }
    if (revisingApproved && request.payments.length) {
      throw new BadRequestException('Payments are recorded against this quotation; it can no longer be revised.');
    }
    const additionalCharges = (dto.additionalCharges ?? []).map((line) => ({
      label: line.label,
      amount: roundMoney(line.amount),
    }));
    const total = roundMoney(
      dto.inspectionCharge + dto.laborCharge + dto.materialCharge +
        additionalCharges.reduce((sum, line) => sum + line.amount, 0),
    );
    const bumpVersion = existing && existing.status !== QuotationStatus.DRAFT;
    const now = new Date();
    const quotation = {
      inspectionCharge: roundMoney(dto.inspectionCharge),
      laborCharge: roundMoney(dto.laborCharge),
      materialCharge: roundMoney(dto.materialCharge),
      additionalCharges,
      total,
      currency: 'PKR',
      notes: dto.notes,
      status: dto.send ? QuotationStatus.SENT : QuotationStatus.DRAFT,
      version: (existing?.version ?? 0) + (bumpVersion || !existing ? 1 : 0),
      preparedBy: oid(adminId),
      updatedAt: now,
      sentAt: dto.send ? now : undefined,
    };
    const events = [
      this.event(revisingApproved ? 'quotation_revised' : 'quotation_saved', 'admin', adminId, {
        note: revisingApproved ? dto.revisionReason : `Quotation v${quotation.version} saved (PKR ${total})`,
        internal: !dto.send,
      }),
    ];
    if (dto.send) {
      events.push(this.event('quotation_sent', 'admin', adminId, {
        note: `Quotation v${quotation.version}: PKR ${total.toLocaleString('en-PK')}`,
      }));
    }
    const updated = await this.commit(request, { $set: { quotation } }, events);
    await this.logAdmin(adminId, dto.send ? 'maintenance.quotation_sent' : 'maintenance.quotation_saved', String(request._id), {
      reason: dto.revisionReason,
      metadata: { reference: request.reference, total, version: quotation.version },
    });
    if (dto.send) await this.notifyQuotationSent(updated);
    return this.toAdminView(updated);
  }

  async sendQuotation(adminId: string, id: string) {
    const request = await this.findById(id);
    if (!QUOTATION_EDITABLE_STATUSES.includes(request.status)) {
      throw new BadRequestException(`Quotations cannot be sent while the request is ${STATUS_LABELS[request.status]}.`);
    }
    if (!request.quotation || request.quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException('Only a draft quotation can be sent. Save a revised quotation first.');
    }
    const updated = await this.commit(request, {
      $set: { 'quotation.status': QuotationStatus.SENT, 'quotation.sentAt': new Date() },
    }, [this.event('quotation_sent', 'admin', adminId, {
      note: `Quotation v${request.quotation.version}: PKR ${request.quotation.total.toLocaleString('en-PK')}`,
    })]);
    await this.logAdmin(adminId, 'maintenance.quotation_sent', String(request._id), {
      metadata: { reference: request.reference, total: request.quotation.total },
    });
    await this.notifyQuotationSent(updated);
    return this.toAdminView(updated);
  }

  async recordPayment(adminId: string, id: string, dto: RecordPaymentDto) {
    const request = await this.findById(id);
    if (request.status === MaintenanceStatus.CANCELLED) {
      throw new BadRequestException('Payments cannot be recorded on a cancelled request.');
    }
    if (!request.quotation || request.quotation.status !== QuotationStatus.APPROVED) {
      throw new BadRequestException('Payments can be recorded only against an approved quotation.');
    }
    const paid = roundMoney(request.payments.reduce((sum, payment) => sum + payment.amount, 0));
    const next = roundMoney(paid + dto.amount);
    if (next > request.quotation.total) {
      throw new BadRequestException(
        `This payment exceeds the approved total. Outstanding balance is PKR ${roundMoney(request.quotation.total - paid)}.`,
      );
    }
    const paymentStatus = next >= request.quotation.total ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;
    const updated = await this.commit(request, {
      $set: { paymentStatus },
      $push: {
        payments: {
          _id: new Types.ObjectId(),
          amount: roundMoney(dto.amount),
          method: dto.method,
          reference: dto.reference,
          note: dto.note,
          recordedBy: oid(adminId),
          recordedAt: new Date(),
        },
      },
    }, [this.event('payment_recorded', 'admin', adminId, {
      note: `PKR ${roundMoney(dto.amount).toLocaleString('en-PK')} via ${dto.method.replace('_', ' ')}`,
    })]);
    await this.logAdmin(adminId, 'maintenance.payment_recorded', String(request._id), {
      newStatus: paymentStatus,
      metadata: { reference: request.reference, amount: dto.amount, method: dto.method },
    });
    return this.toAdminView(updated);
  }

  async updateComplaint(adminId: string, id: string, complaintId: string, dto: UpdateComplaintDto) {
    const request = await this.findById(id);
    const complaint = request.complaints.find((item) => sameId(item._id, complaintId));
    if (!complaint) throw new NotFoundException('Complaint not found.');
    if ([ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED].includes(dto.status) && !dto.resolutionNote?.trim()) {
      throw new BadRequestException('A resolution note is required to resolve or close a complaint.');
    }
    const at = new Date();
    const complaints = request.complaints.map((item) =>
      sameId(item._id, complaintId)
        ? {
          ...item,
          status: dto.status,
          resolutionNote: dto.resolutionNote ?? item.resolutionNote,
          ...(dto.status === ComplaintStatus.IN_REVIEW ? {} : { resolvedBy: oid(adminId), resolvedAt: at }),
        }
        : item,
    );
    const hasOpenComplaint = complaints.some((item) =>
      [ComplaintStatus.OPEN, ComplaintStatus.IN_REVIEW].includes(item.status),
    );
    const updated = await this.commit(request, {
      $set: { complaints, hasOpenComplaint },
    }, [this.event('complaint_updated', 'admin', adminId, {
      note: `Complaint "${complaint.subject}" marked ${dto.status.replace('_', ' ')}${dto.resolutionNote ? `: ${dto.resolutionNote}` : ''}`,
    })]);
    await this.logAdmin(adminId, 'maintenance.complaint_updated', String(request._id), {
      previousStatus: complaint.status,
      newStatus: dto.status,
      reason: dto.resolutionNote,
      metadata: { reference: request.reference, complaintId },
    });
    await this.notifications.notifyUser(request.customerId, {
      type: 'maintenance.complaint_updated',
      title: 'Complaint update',
      message: `${request.reference}: your complaint "${complaint.subject}" is now ${dto.status.replace('_', ' ')}.`,
      link: `/buyer/maintenance/${String(request._id)}`,
      entityType: 'maintenance_request',
      entityId: String(request._id),
      dedupeKey: `maintenance.complaint_updated:${complaintId}:${updated.revision}`,
    });
    return this.toAdminView(updated);
  }

  async addAdminNote(adminId: string, id: string, note: string) {
    const request = await this.findById(id);
    if (request.workNotes.length >= 100) throw new BadRequestException('Note limit reached for this request.');
    const updated = await this.commit(request, {
      $push: {
        workNotes: {
          _id: new Types.ObjectId(),
          authorId: oid(adminId),
          authorRole: 'admin',
          note,
          internal: true,
          createdAt: new Date(),
        },
      },
    }, []);
    return this.toAdminView(updated);
  }

  // ═══════════════════════════ Internals ═══════════════════════════

  private async assertAssignableTechnician(technicianId: string, category: string) {
    const [user, profile] = await Promise.all([
      this.userModel
        .findOne({ _id: technicianId, role: UserRole.TECHNICIAN })
        .select('_id accountStatus')
        .lean()
        .exec(),
      this.profileModel.findOne({ userId: oid(technicianId) }).lean().exec(),
    ]);
    if (!user || !profile) throw new NotFoundException('Technician not found.');
    if (!profile.isActive || (user.accountStatus && user.accountStatus !== UserAccountStatus.ACTIVE)) {
      throw new BadRequestException('This technician is not active.');
    }
    if (profile.availability !== TechnicianAvailability.AVAILABLE) {
      throw new BadRequestException('This technician is not currently available.');
    }
    if (!profile.categories.includes(category)) {
      throw new BadRequestException(`This technician is not registered for ${categoryLabel(category)} jobs.`);
    }
  }

  private async findById(id: string): Promise<RequestRecord> {
    const request = (await this.requestModel.findById(id).lean().exec()) as RequestRecord | null;
    if (!request) throw new NotFoundException('Maintenance request not found.');
    return request;
  }

  private async findCustomerRequest(customerId: string, id: string): Promise<RequestRecord> {
    const request = (await this.requestModel
      .findOne({ _id: id, customerId: oid(customerId) })
      .lean()
      .exec()) as RequestRecord | null;
    // 404 (not 403) so request ids belonging to others are not enumerable.
    if (!request) throw new NotFoundException('Maintenance request not found.');
    return request;
  }

  /**
   * Loads a job visible to the technician. With `requireCurrent`, the caller
   * must be the currently assigned technician (used for every mutation).
   */
  private async findTechnicianJob(technicianId: string, id: string, requireCurrent: boolean): Promise<RequestRecord> {
    const me = oid(technicianId);
    const filter = requireCurrent
      ? { _id: id, technicianId: me }
      : { _id: id, $or: [{ technicianId: me }, { 'assignments.technicianId': me }] };
    const request = (await this.requestModel.findOne(filter).lean().exec()) as RequestRecord | null;
    if (!request) throw new NotFoundException('Job not found.');
    return request;
  }

  private async commit(
    request: RequestRecord,
    update: MongoUpdate,
    events: MaintenanceTimelineEvent[],
  ): Promise<RequestRecord> {
    const push: Record<string, unknown> = { ...(update.$push ?? {}) };
    if (events.length) push.timeline = { $each: events };
    const mongoUpdate: Record<string, unknown> = { $inc: { revision: 1 } };
    if (update.$set && Object.keys(update.$set).length) mongoUpdate.$set = update.$set;
    if (Object.keys(push).length) mongoUpdate.$push = push;
    const updated = (await this.requestModel
      .findOneAndUpdate(
        { _id: request._id, revision: request.revision ?? 0 },
        mongoUpdate,
        { new: true },
      )
      .lean()
      .exec()) as RequestRecord | null;
    if (!updated) {
      throw new ConflictException('This request was updated by someone else. Refresh and try again.');
    }
    return updated;
  }

  private async applyStatusChange(
    request: RequestRecord,
    to: MaintenanceStatus,
    actorRole: MaintenanceActorRole,
    actorId: string,
    options: StatusChangeOptions = {},
  ): Promise<RequestRecord> {
    const set: Record<string, unknown> = { status: to, ...(options.extraSet ?? {}) };
    const currentAssignment = this.currentAssignment(request);
    if (currentAssignment && (options.assignmentUpdate || options.withdrawAssignmentReason || options.completeAssignment)) {
      set.assignments = request.assignments.map((assignment) => {
        if (!sameId(assignment._id, currentAssignment._id)) return assignment;
        if (options.assignmentUpdate) return { ...assignment, ...options.assignmentUpdate };
        if (options.completeAssignment) return { ...assignment, status: AssignmentStatus.COMPLETED };
        return {
          ...assignment,
          status: AssignmentStatus.WITHDRAWN,
          withdrawnReason: options.withdrawAssignmentReason,
        };
      });
      if (options.withdrawAssignmentReason) set.technicianId = null;
    }
    return this.commit(request, {
      $set: set,
      $push: options.extraPush,
    }, [
      this.event('status_changed', actorRole, actorId, {
        fromStatus: request.status,
        toStatus: to,
        note: options.note,
        internal: options.internal,
      }),
    ]);
  }

  private currentAssignment(request: RequestRecord): MaintenanceAssignment | undefined {
    if (!request.technicianId) return undefined;
    for (let index = request.assignments.length - 1; index >= 0; index -= 1) {
      const assignment = request.assignments[index];
      if (
        sameId(assignment.technicianId, request.technicianId) &&
        [AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED].includes(assignment.status)
      ) {
        return assignment;
      }
    }
    return undefined;
  }

  private event(
    event: string,
    actorRole: MaintenanceActorRole,
    actorId: string | undefined,
    details: { fromStatus?: string; toStatus?: string; note?: string; internal?: boolean } = {},
  ): MaintenanceTimelineEvent {
    return {
      _id: new Types.ObjectId(),
      event,
      actorRole,
      actorId: actorId ? oid(actorId) : undefined,
      fromStatus: details.fromStatus,
      toStatus: details.toStatus,
      note: details.note?.slice(0, 1000),
      internal: details.internal ?? false,
      at: new Date(),
    };
  }

  private async saveImages(
    files: UploadedMaintenanceImage[],
    kind: 'problem' | 'before' | 'after',
    uploadedBy: string,
  ) {
    const saved: Array<Record<string, unknown> & { filename: string }> = [];
    try {
      for (const file of files) {
        const stored = await this.imageStorage.save(file);
        saved.push({
          _id: new Types.ObjectId(),
          filename: stored.filename,
          contentType: stored.contentType,
          size: stored.size,
          kind,
          uploadedBy: oid(uploadedBy),
          uploadedAt: new Date(),
        });
      }
    } catch (error) {
      await Promise.all(saved.map((image) => this.imageStorage.discard(image.filename)));
      throw error;
    }
    return saved;
  }

  private assertUploadCount(files: UploadedMaintenanceImage[], existing: number, max: number, label: string) {
    if (!files?.length) throw new BadRequestException('Select at least one image to upload.');
    if (files.length > MAX_IMAGES_PER_UPLOAD) {
      throw new BadRequestException(`Upload at most ${MAX_IMAGES_PER_UPLOAD} images at a time.`);
    }
    if (existing + files.length > max) {
      throw new BadRequestException(`A request can have at most ${max} ${label}.`);
    }
  }

  private parsePreferredDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid preferred visit date.');
    const now = Date.now();
    if (date.getTime() < now - DAY_MS) {
      throw new BadRequestException('The preferred visit date cannot be in the past.');
    }
    if (date.getTime() > now + 90 * DAY_MS) {
      throw new BadRequestException('The preferred visit date must be within the next 90 days.');
    }
    return date;
  }

  private generateReference(now: Date): string {
    const stamp = now.toISOString().slice(2, 10).replace(/-/g, '');
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(5);
    const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
    return `GS-MR-${stamp}-${suffix}`;
  }

  private isDuplicateKey(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: number }).code === 11000);
  }

  private async logAdmin(
    adminId: string,
    actionType: string,
    entityId: string,
    details: { previousStatus?: string; newStatus?: string; reason?: string; metadata?: Record<string, unknown> },
  ) {
    try {
      await this.activityModel.create({
        adminId: oid(adminId),
        actionType,
        entityType: 'maintenance_request',
        entityId,
        previousStatus: details.previousStatus,
        newStatus: details.newStatus,
        reason: details.reason?.trim(),
        metadata: details.metadata,
        occurredAt: new Date(),
      });
    } catch (error) {
      this.logger.warn(`Admin activity logging failed for ${actionType}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async notifyQuotationSent(request: RequestRecord) {
    if (!request.quotation) return;
    const id = String(request._id);
    await this.notifications.notifyUser(request.customerId, {
      type: 'maintenance.quotation_sent',
      title: 'Quotation ready for approval',
      message: `${request.reference}: quotation of PKR ${request.quotation.total.toLocaleString('en-PK')} is awaiting your approval.`,
      link: `/buyer/maintenance/${id}`,
      entityType: 'maintenance_request',
      entityId: id,
      dedupeKey: `maintenance.quotation_sent:${id}:v${request.quotation.version}:${request.revision}`,
    });
  }

  private async notifyStatusChange(
    request: RequestRecord,
    previousStatus: MaintenanceStatus,
    previousTechnicianId?: Types.ObjectId | null,
  ) {
    const id = String(request._id);
    const label = STATUS_LABELS[request.status];
    const dedupe = `maintenance.status:${id}:${request.revision}`;
    const base = { type: 'maintenance.status_changed', entityType: 'maintenance_request', entityId: id, dedupeKey: dedupe };
    const tasks: Promise<void>[] = [];
    const customerMessages: Partial<Record<MaintenanceStatus, string>> = {
      [MaintenanceStatus.UNDER_REVIEW]: 'Our operations team is reviewing your request.',
      [MaintenanceStatus.ACCEPTED]: 'Your technician has confirmed the visit.',
      [MaintenanceStatus.RESCHEDULING]: 'We are arranging a new technician or visit time.',
      [MaintenanceStatus.REJECTED]: 'We are arranging a different technician for your visit.',
      [MaintenanceStatus.ON_THE_WAY]: 'Your technician is on the way.',
      [MaintenanceStatus.IN_PROGRESS]: 'Work has started on your request.',
      [MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION]: 'The technician has finished. Please review and confirm completion.',
      [MaintenanceStatus.COMPLETED]: 'Your job is complete. Please share your feedback.',
      [MaintenanceStatus.CANCELLED]: 'Your request has been cancelled.',
      [MaintenanceStatus.DISPUTED]: 'Your request is under dispute review by our team.',
    };
    const customerMessage = customerMessages[request.status];
    if (customerMessage) {
      tasks.push(this.notifications.notifyUser(request.customerId, {
        ...base,
        title: `Request ${label}`,
        message: `${request.reference}: ${customerMessage}`,
        link: `/buyer/maintenance/${id}`,
      }));
    }
    const technicianId = request.technicianId ?? previousTechnicianId;
    const lastActor = request.timeline[request.timeline.length - 1]?.actorRole;
    if (technicianId && lastActor !== 'technician') {
      tasks.push(this.notifications.notifyUser(technicianId, {
        ...base,
        title: `Job ${label}`,
        message: `${request.reference} moved from ${STATUS_LABELS[previousStatus]} to ${label}.`,
        link: `/technician/jobs/${id}`,
      }));
    }
    if (lastActor !== 'admin') {
      tasks.push(this.notifications.notifyAdmins({
        ...base,
        title: `${request.reference}: ${label}`,
        message: `Status changed from ${STATUS_LABELS[previousStatus]} to ${label}.`,
        link: `/admin/maintenance/requests/${id}`,
      }));
    }
    await Promise.all(tasks);
  }

  private async loadUsers(ids: unknown[]) {
    const unique = [...new Set(ids.filter(Boolean).map(String))];
    if (!unique.length) return new Map<string, { id: string; name: string; phone: string | null; email: string }>();
    const users = await this.userModel
      .find({ _id: { $in: unique.map((value) => oid(value)) } })
      .select('name phone email')
      .lean()
      .exec();
    return new Map(users.map((user) => [
      String(user._id),
      { id: String(user._id), name: user.name, phone: user.phone ?? null, email: user.email },
    ]));
  }

  private async loadTechnicianContact(request: RequestRecord) {
    if (!request.technicianId || !POST_ACCEPTANCE_STATUSES.includes(request.status)) return null;
    const users = await this.loadUsers([request.technicianId]);
    const user = users.get(String(request.technicianId));
    return user ? { name: user.name, phone: user.phone } : null;
  }

  private imagesView(request: RequestRecord, kinds: Array<'problem' | 'before' | 'after'>) {
    return request.images
      .filter((image) => kinds.includes(image.kind))
      .map((image) => ({
        id: String(image._id),
        kind: image.kind,
        url: `/maintenance/requests/${String(request._id)}/images/${String(image._id)}`,
        uploadedAt: image.uploadedAt,
      }));
  }

  private quotationView(request: RequestRecord, includeDraft: boolean) {
    const quotation = request.quotation;
    if (!quotation || (!includeDraft && quotation.status === QuotationStatus.DRAFT)) return null;
    return {
      inspectionCharge: quotation.inspectionCharge,
      laborCharge: quotation.laborCharge,
      materialCharge: quotation.materialCharge,
      additionalCharges: quotation.additionalCharges ?? [],
      total: quotation.total,
      currency: quotation.currency ?? 'PKR',
      notes: quotation.notes ?? null,
      status: quotation.status,
      version: quotation.version,
      sentAt: quotation.sentAt ?? null,
      respondedAt: quotation.respondedAt ?? null,
      customerNote: quotation.customerNote ?? null,
    };
  }

  toListItem(request: RequestRecord, includeCustomer = false) {
    return {
      id: String(request._id),
      reference: request.reference,
      title: request.title,
      category: request.category,
      categoryLabel: categoryLabel(request.category),
      propertyType: request.propertyType,
      area: request.address?.area,
      city: request.address?.city,
      status: request.status,
      statusLabel: STATUS_LABELS[request.status],
      preferredVisitDate: request.preferredVisitDate ?? null,
      preferredTimeSlot: request.preferredTimeSlot,
      scheduledVisitAt: request.scheduledVisitAt ?? null,
      quotationStatus: request.quotation?.status ?? null,
      hasOpenComplaint: request.hasOpenComplaint ?? false,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      ...(includeCustomer ? { customerName: request.contact?.name } : {}),
    };
  }

  toCustomerView(request: RequestRecord, technician: { name: string; phone: string | null } | null = null) {
    const status = request.status;
    const quotation = this.quotationView(request, false);
    return {
      ...this.toListItem(request),
      description: request.description,
      address: request.address,
      contact: request.contact,
      images: this.imagesView(request, ['problem', 'before', 'after']),
      technician: technician && POST_ACCEPTANCE_STATUSES.includes(status) ? technician : null,
      technicianPending: [
        MaintenanceStatus.ASSIGNED,
        MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE,
        MaintenanceStatus.REJECTED,
        MaintenanceStatus.RESCHEDULING,
      ].includes(status),
      quotation,
      paymentStatus: request.paymentStatus ?? PaymentStatus.UNPAID,
      payments: (request.payments ?? []).map((payment) => ({
        id: String(payment._id),
        amount: payment.amount,
        method: payment.method,
        recordedAt: payment.recordedAt,
      })),
      workNotes: (request.workNotes ?? [])
        .filter((note) => !note.internal)
        .map((note) => ({ id: String(note._id), note: note.note, authorRole: note.authorRole, createdAt: note.createdAt })),
      completionReport: request.completionReport
        ? {
          checklist: request.completionReport.checklist,
          summary: request.completionReport.summary ?? null,
          submittedAt: request.completionReport.submittedAt ?? null,
        }
        : null,
      timeline: (request.timeline ?? [])
        .filter((event) => !event.internal)
        .map((event) => ({
          id: String(event._id),
          event: event.event,
          fromStatus: event.fromStatus ?? null,
          toStatus: event.toStatus ?? null,
          actorRole: event.actorRole,
          note: event.note ?? null,
          at: event.at,
        })),
      feedback: request.feedback
        ? { rating: request.feedback.rating, comment: request.feedback.comment ?? null, createdAt: request.feedback.createdAt }
        : null,
      complaints: (request.complaints ?? []).map((complaint) => ({
        id: String(complaint._id),
        subject: complaint.subject,
        description: complaint.description,
        status: complaint.status,
        resolutionNote: complaint.resolutionNote ?? null,
        createdAt: complaint.createdAt,
        resolvedAt: complaint.resolvedAt ?? null,
      })),
      cancellationReason: request.cancellationReason ?? null,
      completedAt: request.completedAt ?? null,
      actions: {
        canCancel: CUSTOMER_CANCELLABLE_STATUSES.includes(status),
        canUploadImages:
          [MaintenanceStatus.PENDING, MaintenanceStatus.UNDER_REVIEW].includes(status) &&
          request.images.filter((image) => image.kind === 'problem').length < MAX_PROBLEM_IMAGES,
        canRespondToQuotation:
          quotation?.status === QuotationStatus.SENT &&
          status !== MaintenanceStatus.CANCELLED &&
          status !== MaintenanceStatus.COMPLETED,
        canConfirmCompletion: status === MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION,
        canSubmitFeedback: status === MaintenanceStatus.COMPLETED && !request.feedback,
        canRaiseComplaint: status !== MaintenanceStatus.CANCELLED && (request.complaints?.length ?? 0) < 5,
      },
    };
  }

  toTechnicianView(request: RequestRecord, technicianId: string) {
    const isCurrent = sameId(request.technicianId, technicianId);
    const myAssignments = request.assignments.filter((assignment) => sameId(assignment.technicianId, technicianId));
    const mine = myAssignments[myAssignments.length - 1];
    const assignmentView = mine
      ? {
        status: mine.status,
        assignedAt: mine.assignedAt,
        respondedAt: mine.respondedAt ?? null,
        scheduledVisitAt: mine.scheduledVisitAt ?? null,
        dispatchNotes: isCurrent ? mine.notes ?? null : null,
        rejectionReason: mine.rejectionReason ?? null,
        withdrawn: mine.status === AssignmentStatus.WITHDRAWN,
      }
      : null;
    const base = {
      id: String(request._id),
      reference: request.reference,
      title: request.title,
      category: request.category,
      categoryLabel: categoryLabel(request.category),
      propertyType: request.propertyType,
      area: request.address?.area,
      city: request.address?.city,
      isCurrent,
      myAssignment: assignmentView,
      updatedAt: request.updatedAt,
    };
    if (!isCurrent) {
      // Past assignees keep a minimal history record only.
      return { ...base, status: null, statusLabel: 'Reassigned / closed for you' };
    }
    const accepted = POST_ACCEPTANCE_STATUSES.includes(request.status);
    const quotation = this.quotationView(request, false);
    return {
      ...base,
      status: request.status,
      statusLabel: STATUS_LABELS[request.status],
      description: request.description,
      preferredVisitDate: request.preferredVisitDate ?? null,
      preferredTimeSlot: request.preferredTimeSlot,
      scheduledVisitAt: request.scheduledVisitAt ?? null,
      // Exact address and contact are disclosed only after the technician accepts.
      address: accepted ? request.address : null,
      contact: accepted ? { name: request.contact.name, phone: request.contact.phone } : null,
      images: this.imagesView(request, ['problem', 'before', 'after']),
      quotation: quotation
        ? { total: quotation.total, status: quotation.status, version: quotation.version, currency: quotation.currency }
        : null,
      workNotes: (request.workNotes ?? [])
        .filter((note) => !note.internal)
        .map((note) => ({ id: String(note._id), note: note.note, authorRole: note.authorRole, createdAt: note.createdAt })),
      completionReport: request.completionReport ?? null,
      actions: {
        canAccept: request.status === MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE,
        canReject: request.status === MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE,
        canMarkOnTheWay: request.status === MaintenanceStatus.ACCEPTED,
        canStartWork:
          request.status === MaintenanceStatus.ON_THE_WAY &&
          !(quotation && [QuotationStatus.SENT, QuotationStatus.REJECTED].includes(quotation.status)),
        canAddNotes: TECHNICIAN_WORKING_STATUSES.includes(request.status),
        canUploadPhotos: TECHNICIAN_WORKING_STATUSES.includes(request.status),
        canSubmitCompletion: request.status === MaintenanceStatus.IN_PROGRESS,
      },
    };
  }

  async toAdminView(request: RequestRecord) {
    const userIds = [
      request.customerId,
      request.technicianId,
      ...request.assignments.map((assignment) => assignment.technicianId),
    ];
    const users = await this.loadUsers(userIds);
    const customer = users.get(String(request.customerId)) ?? null;
    return {
      ...this.toListItem(request, true),
      description: request.description,
      address: request.address,
      contact: request.contact,
      customer,
      images: this.imagesView(request, ['problem', 'before', 'after']),
      technician: request.technicianId ? users.get(String(request.technicianId)) ?? null : null,
      assignments: request.assignments.map((assignment) => ({
        id: String(assignment._id),
        technician: users.get(String(assignment.technicianId)) ?? { id: String(assignment.technicianId), name: 'Unknown technician' },
        assignedAt: assignment.assignedAt,
        scheduledVisitAt: assignment.scheduledVisitAt ?? null,
        notes: assignment.notes ?? null,
        status: assignment.status,
        respondedAt: assignment.respondedAt ?? null,
        rejectionReason: assignment.rejectionReason ?? null,
        withdrawnReason: assignment.withdrawnReason ?? null,
      })),
      quotation: this.quotationView(request, true),
      paymentStatus: request.paymentStatus ?? PaymentStatus.UNPAID,
      payments: (request.payments ?? []).map((payment) => ({
        id: String(payment._id),
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference ?? null,
        note: payment.note ?? null,
        recordedAt: payment.recordedAt,
      })),
      workNotes: (request.workNotes ?? []).map((note) => ({
        id: String(note._id),
        note: note.note,
        authorRole: note.authorRole,
        internal: note.internal,
        createdAt: note.createdAt,
      })),
      completionReport: request.completionReport ?? null,
      timeline: (request.timeline ?? []).map((event) => ({
        id: String(event._id),
        event: event.event,
        fromStatus: event.fromStatus ?? null,
        toStatus: event.toStatus ?? null,
        actorRole: event.actorRole,
        note: event.note ?? null,
        internal: event.internal,
        at: event.at,
      })),
      feedback: request.feedback ?? null,
      complaints: (request.complaints ?? []).map((complaint) => ({
        id: String(complaint._id),
        subject: complaint.subject,
        description: complaint.description,
        status: complaint.status,
        resolutionNote: complaint.resolutionNote ?? null,
        createdAt: complaint.createdAt,
        resolvedAt: complaint.resolvedAt ?? null,
      })),
      cancellationReason: request.cancellationReason ?? null,
      completedAt: request.completedAt ?? null,
      allowedStatusTargets: this.adminTargets(request.status),
      canAssign: ASSIGNABLE_STATUSES.includes(request.status),
      canEditQuotation: QUOTATION_EDITABLE_STATUSES.includes(request.status),
    };
  }

  private adminTargets(status: MaintenanceStatus): MaintenanceStatus[] {
    return Object.values(MaintenanceStatus).filter((to) => canTransition('admin', status, to));
  }
}

interface StatusChangeOptions {
  note?: string;
  internal?: boolean;
  extraSet?: Record<string, unknown>;
  extraPush?: Record<string, unknown>;
  assignmentUpdate?: Partial<MaintenanceAssignment>;
  withdrawAssignmentReason?: string;
  completeAssignment?: boolean;
}

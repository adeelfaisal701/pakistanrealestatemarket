import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { escapeRegExp } from '../../common/utils/escape-regexp';
import {
  AdminActivity,
  AdminActivityDocument,
} from '../admin/schemas/admin-activity.schema';
import { normalizeAuthEmail } from '../auth/auth-rate-limit.service';
import {
  User,
  UserAccountStatus,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';
import {
  CreateTechnicianDto,
  TechnicianActivationDto,
  TechniciansQueryDto,
  UpdateTechnicianDto,
} from './dto/maintenance.dto';
import {
  AssignmentStatus,
  MaintenanceStatus,
  STATUS_LABELS,
  TECHNICIAN_ACTIVE_JOB_STATUSES,
  TechnicianAvailability,
  categoryLabel,
} from './maintenance.constants';
import {
  MaintenanceRequest,
  MaintenanceRequestDocument,
} from './schemas/maintenance-request.schema';
import {
  TechnicianProfile,
  TechnicianProfileDocument,
} from './schemas/technician-profile.schema';

type ProfileRecord = TechnicianProfile & { _id: Types.ObjectId; createdAt?: Date };

function normalizeList(values: string[] | undefined, lower = false): string[] {
  const seen = new Set<string>();
  for (const raw of values ?? []) {
    const value = raw.trim().replace(/\s+/g, ' ');
    if (!value) continue;
    seen.add(lower ? value.toLowerCase() : value);
  }
  return [...seen];
}

/**
 * Admin-only technician management. Technicians are platform-managed
 * operational accounts and never appear in public endpoints.
 */
@Injectable()
export class TechnicianManagementService {
  private readonly logger = new Logger(TechnicianManagementService.name);

  constructor(
    @InjectModel(TechnicianProfile.name)
    private readonly profileModel: Model<TechnicianProfileDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(MaintenanceRequest.name)
    private readonly requestModel: Model<MaintenanceRequestDocument>,
    @InjectModel(AdminActivity.name)
    private readonly activityModel: Model<AdminActivityDocument>,
  ) {}

  async list(query: Partial<TechniciansQueryDto> = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const filter: Record<string, unknown> = {};
    if (query.state === 'active') filter.isActive = true;
    if (query.state === 'inactive') filter.isActive = false;
    if (query.category && query.category !== 'all') filter.categories = query.category;
    if (query.availability && query.availability !== 'all') filter.availability = query.availability;
    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegExp(query.search.trim()), 'i');
      const users = await this.userModel
        .find({ role: UserRole.TECHNICIAN, $or: [{ name: regex }, { email: regex }, { phone: regex }] })
        .select('_id')
        .limit(500)
        .lean()
        .exec();
      filter.$or = [
        { userId: { $in: users.map((user) => user._id) } },
        { serviceAreas: regex },
        { skills: regex },
      ];
    }
    const [profiles, total] = await Promise.all([
      this.profileModel
        .find(filter)
        .sort({ isActive: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.profileModel.countDocuments(filter).exec(),
    ]);
    const items = await this.decorate(profiles as ProfileRecord[]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Technicians eligible for a request: active account and profile,
   * available, and registered for the request category. Service-area matches
   * are listed first, then the lightest current workload.
   */
  async eligibleForRequest(requestId: string) {
    const request = await this.requestModel
      .findById(requestId)
      .select('category address technicianId')
      .lean()
      .exec();
    if (!request) throw new NotFoundException('Maintenance request not found.');
    const profiles = (await this.profileModel
      .find({
        isActive: true,
        availability: TechnicianAvailability.AVAILABLE,
        categories: request.category,
      })
      .limit(200)
      .lean()
      .exec()) as ProfileRecord[];
    const decorated = await this.decorate(profiles);
    const area = request.address?.area?.trim().toLowerCase() ?? '';
    const city = request.address?.city?.trim().toLowerCase() ?? '';
    return decorated
      .filter((technician) => technician.accountStatus === UserAccountStatus.ACTIVE)
      .filter((technician) => String(technician.id) !== String(request.technicianId ?? ''))
      .map((technician) => ({
        ...technician,
        areaMatch:
          technician.serviceAreas.some((serviceArea) => area && (area.includes(serviceArea) || serviceArea.includes(area))) ||
          false,
        cityMatch: technician.city?.toLowerCase() === city,
      }))
      .sort((a, b) =>
        Number(b.areaMatch) - Number(a.areaMatch) ||
        Number(b.cityMatch) - Number(a.cityMatch) ||
        a.activeJobs - b.activeJobs,
      );
  }

  async create(adminId: string, dto: CreateTechnicianDto) {
    const email = normalizeAuthEmail(dto.email);
    const existing = await this.userModel.findOne({ email }).select('_id').lean().exec();
    if (existing) throw new ConflictException('An account with this email address already exists.');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({
      name: dto.name,
      email,
      phone: dto.phone,
      role: UserRole.TECHNICIAN,
      city: dto.city?.trim() || 'Lahore',
      passwordHash,
      accountStatus: UserAccountStatus.ACTIVE,
    });
    try {
      await this.profileModel.create({
        userId: user._id,
        categories: normalizeList(dto.categories),
        skills: normalizeList(dto.skills),
        serviceAreas: normalizeList(dto.serviceAreas, true),
        city: dto.city?.trim() || 'Lahore',
        availability: dto.availability ?? TechnicianAvailability.AVAILABLE,
        isActive: true,
        internalNotes: dto.internalNotes,
        createdBy: new Types.ObjectId(adminId),
      });
    } catch (error) {
      // Roll back the just-created account so no orphan technician login exists.
      await this.userModel.deleteOne({ _id: user._id, role: UserRole.TECHNICIAN }).exec();
      throw error;
    }
    await this.logAdmin(adminId, 'technician.create', String(user._id), {
      newStatus: 'active',
      metadata: { categories: dto.categories },
    });
    return this.get(String(user._id));
  }

  async get(technicianId: string) {
    const profile = (await this.profileModel
      .findOne({ userId: new Types.ObjectId(technicianId) })
      .lean()
      .exec()) as ProfileRecord | null;
    if (!profile) throw new NotFoundException('Technician not found.');
    const [technician] = await this.decorate([profile], true);
    if (!technician) throw new NotFoundException('Technician not found.');

    const me = new Types.ObjectId(technicianId);
    const jobs = await this.requestModel
      .find({ 'assignments.technicianId': me })
      .select('reference title category status assignments address feedback technicianId createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean()
      .exec();
    const history = jobs.map((job) => {
      const mine = job.assignments.filter((assignment) => String(assignment.technicianId) === technicianId);
      const latest = mine[mine.length - 1];
      return {
        requestId: String(job._id),
        reference: job.reference,
        title: job.title,
        category: job.category,
        categoryLabel: categoryLabel(job.category),
        area: job.address?.area,
        requestStatus: job.status,
        requestStatusLabel: STATUS_LABELS[job.status as MaintenanceStatus],
        isCurrent: String(job.technicianId ?? '') === technicianId,
        assignmentStatus: latest?.status,
        assignedAt: latest?.assignedAt,
        respondedAt: latest?.respondedAt ?? null,
        rejectionReason: latest?.rejectionReason ?? null,
        withdrawnReason: latest?.withdrawnReason ?? null,
        rating: String(job.feedback?.technicianId ?? '') === technicianId ? job.feedback?.rating ?? null : null,
      };
    });
    const allAssignments = jobs.flatMap((job) =>
      job.assignments.filter((assignment) => String(assignment.technicianId) === technicianId),
    );
    const ratings = history.map((item) => item.rating).filter((rating): rating is number => typeof rating === 'number');
    return {
      ...technician,
      internalNotes: profile.internalNotes ?? null,
      statusReason: profile.statusReason ?? null,
      stats: {
        totalAssignments: allAssignments.length,
        accepted: allAssignments.filter((item) =>
          [AssignmentStatus.ACCEPTED, AssignmentStatus.COMPLETED].includes(item.status) ||
          (item.status === AssignmentStatus.WITHDRAWN && Boolean(item.respondedAt)),
        ).length,
        rejected: allAssignments.filter((item) => item.status === AssignmentStatus.REJECTED).length,
        completed: allAssignments.filter((item) => item.status === AssignmentStatus.COMPLETED).length,
        averageRating: ratings.length
          ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
          : null,
        ratingsCount: ratings.length,
      },
      history,
    };
  }

  async update(adminId: string, technicianId: string, dto: UpdateTechnicianDto) {
    const profile = await this.profileModel
      .findOne({ userId: new Types.ObjectId(technicianId) })
      .lean()
      .exec();
    if (!profile) throw new NotFoundException('Technician not found.');
    const userSet: Record<string, unknown> = {};
    if (dto.name !== undefined) userSet.name = dto.name;
    if (dto.phone !== undefined) userSet.phone = dto.phone;
    if (dto.city !== undefined) userSet.city = dto.city;
    if (Object.keys(userSet).length) {
      const result = await this.userModel
        .updateOne({ _id: technicianId, role: UserRole.TECHNICIAN }, { $set: userSet })
        .exec();
      if (!result.matchedCount) throw new NotFoundException('Technician not found.');
    }
    const profileSet: Record<string, unknown> = {};
    if (dto.categories !== undefined) profileSet.categories = normalizeList(dto.categories);
    if (dto.skills !== undefined) profileSet.skills = normalizeList(dto.skills);
    if (dto.serviceAreas !== undefined) profileSet.serviceAreas = normalizeList(dto.serviceAreas, true);
    if (dto.city !== undefined) profileSet.city = dto.city;
    if (dto.availability !== undefined) profileSet.availability = dto.availability;
    if (dto.internalNotes !== undefined) profileSet.internalNotes = dto.internalNotes;
    if (Object.keys(profileSet).length) {
      await this.profileModel.updateOne({ _id: profile._id }, { $set: profileSet }).exec();
    }
    await this.logAdmin(adminId, 'technician.update', technicianId, {
      metadata: { fields: [...Object.keys(userSet), ...Object.keys(profileSet)] },
    });
    return this.get(technicianId);
  }

  async setActive(adminId: string, technicianId: string, dto: TechnicianActivationDto) {
    const profile = await this.profileModel
      .findOne({ userId: new Types.ObjectId(technicianId) })
      .lean()
      .exec();
    if (!profile) throw new NotFoundException('Technician not found.');
    if (!dto.active) {
      if (!dto.reason?.trim()) throw new BadRequestException('A reason is required to deactivate a technician.');
      const activeJobs = await this.requestModel
        .countDocuments({
          technicianId: new Types.ObjectId(technicianId),
          status: { $in: TECHNICIAN_ACTIVE_JOB_STATUSES },
        })
        .exec();
      if (activeJobs > 0) {
        throw new ConflictException(
          `This technician has ${activeJobs} active job(s). Reassign them before deactivating.`,
        );
      }
    }
    const accountStatus = dto.active ? UserAccountStatus.ACTIVE : UserAccountStatus.SUSPENDED;
    const userResult = await this.userModel
      .updateOne(
        { _id: technicianId, role: UserRole.TECHNICIAN },
        {
          $set: {
            accountStatus,
            accountStatusReason: dto.reason,
            accountStatusChangedAt: new Date(),
            accountStatusChangedBy: new Types.ObjectId(adminId),
          },
        },
      )
      .exec();
    if (!userResult.matchedCount) throw new NotFoundException('Technician not found.');
    await this.profileModel
      .updateOne({ _id: profile._id }, { $set: { isActive: dto.active, statusReason: dto.reason } })
      .exec();
    await this.logAdmin(adminId, dto.active ? 'technician.activate' : 'technician.deactivate', technicianId, {
      previousStatus: profile.isActive ? 'active' : 'inactive',
      newStatus: dto.active ? 'active' : 'inactive',
      reason: dto.reason,
    });
    return this.get(technicianId);
  }

  private async decorate(profiles: ProfileRecord[], includeEmail = true) {
    if (!profiles.length) return [];
    const userIds = profiles.map((profile) => profile.userId);
    const [users, workloads] = await Promise.all([
      this.userModel
        .find({ _id: { $in: userIds }, role: UserRole.TECHNICIAN })
        .select('name email phone accountStatus createdAt')
        .lean()
        .exec(),
      this.requestModel
        .aggregate<{ _id: Types.ObjectId; count: number }>([
          { $match: { technicianId: { $in: userIds }, status: { $in: TECHNICIAN_ACTIVE_JOB_STATUSES } } },
          { $group: { _id: '$technicianId', count: { $sum: 1 } } },
        ])
        .exec(),
    ]);
    const userMap = new Map(users.map((user) => [String(user._id), user]));
    const workloadMap = new Map(workloads.map((row) => [String(row._id), row.count]));
    return profiles
      .filter((profile) => userMap.has(String(profile.userId)))
      .map((profile) => {
        const user = userMap.get(String(profile.userId))!;
        return {
          id: String(profile.userId),
          name: user.name,
          ...(includeEmail ? { email: user.email } : {}),
          phone: user.phone ?? null,
          accountStatus: user.accountStatus ?? UserAccountStatus.ACTIVE,
          categories: profile.categories,
          categoryLabels: profile.categories.map(categoryLabel),
          skills: profile.skills,
          serviceAreas: profile.serviceAreas,
          city: profile.city,
          availability: profile.availability,
          isActive: profile.isActive,
          activeJobs: workloadMap.get(String(profile.userId)) ?? 0,
          createdAt: profile.createdAt ?? null,
        };
      });
  }

  private async logAdmin(
    adminId: string,
    actionType: string,
    entityId: string,
    details: { previousStatus?: string; newStatus?: string; reason?: string; metadata?: Record<string, unknown> },
  ) {
    try {
      await this.activityModel.create({
        adminId: new Types.ObjectId(adminId),
        actionType,
        entityType: 'technician',
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
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AgentVerificationStatus,
  User,
  UserAccountStatus,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';
import { UsersService, type PublicAgentRecord } from '../users/users.service';
import { Agency, AgencyDocument } from './schemas/agency.schema';
import { UpdateAgencyProfileDto } from './dto/update-agency-profile.dto';

export interface AgencyUploadedImages {
  logoUrl?: string;
  coverImageUrl?: string;
  galleryUrls: string[];
}

export interface ManagedAgencyProfileResponse {
  name: string;
  description: string;
  agencyType: string;
  officeAddress: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  coverImageUrl: string;
  galleryUrls: string[];
  agents: PublicAgentRecord[];
  agentCount: number;
}

export interface PublicAgencyProfileResponse {
  name: string;
  agentCount: number;
  locations: string[];
  officeAddresses?: string[];
  agents: PublicAgentRecord[];
  description?: string;
  agencyType?: string;
  officeAddress?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  galleryUrls: string[];
}

@Injectable()
export class AgenciesService {
  constructor(
    @InjectModel(Agency.name) private readonly agencyModel: Model<AgencyDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly usersService: UsersService,
  ) {}

  async getManagedProfile(userId: string): Promise<ManagedAgencyProfileResponse> {
    const { user, name, normalizedName } = await this.getManagingAgent(userId);
    const agency = await this.agencyModel.findOne({ normalizedName }).lean().exec();
    const associatedAgents = await this.userModel
      .find({
        role: UserRole.AGENT,
        accountStatus: UserAccountStatus.ACTIVE,
        agencyName: this.agencyNamePattern(name),
      })
      .select('_id name city avatarUrl isVerified verificationStatus')
      .sort({ name: 1 })
      .lean()
      .exec();
    const agents: PublicAgentRecord[] = associatedAgents.map((agent) => ({
      id: String(agent._id),
      name: agent.name,
      ...(agent.city?.trim() ? { city: agent.city.trim() } : {}),
      ...(agent.avatarUrl?.trim() ? { avatarUrl: agent.avatarUrl.trim() } : {}),
      isVerified:
        agent.isVerified === true &&
        agent.verificationStatus === AgentVerificationStatus.VERIFIED,
    }));

    return {
      ...(agency ?? {}),
      name: agency?.name ?? name,
      description: agency?.description ?? '',
      agencyType: agency?.agencyType ?? '',
      officeAddress: agency?.officeAddress ?? user.agencyAddress?.trim() ?? '',
      city: agency?.city ?? user.city?.trim() ?? '',
      phone: agency?.phone ?? '',
      email: agency?.email ?? '',
      website: agency?.website ?? '',
      logoUrl: agency?.logoUrl ?? '',
      coverImageUrl: agency?.coverImageUrl ?? '',
      galleryUrls: agency?.galleryUrls ?? [],
      agents,
      agentCount: agents.length,
    };
  }

  async updateManagedProfile(
    userId: string,
    dto: UpdateAgencyProfileDto,
    images: AgencyUploadedImages,
  ): Promise<ManagedAgencyProfileResponse> {
    const { user, name: currentName, normalizedName: currentKey } =
      await this.getManagingAgent(userId);
    const nextName = dto.name?.trim() || currentName;
    const nextKey = this.normalizeName(nextName);
    const agency = await this.agencyModel.findOne({ normalizedName: currentKey }).exec();

    if (nextKey !== currentKey) {
      const conflictingAgency = await this.agencyModel
        .findOne({ normalizedName: nextKey })
        .exec();
      if (conflictingAgency && String(conflictingAgency._id) !== String(agency?._id)) {
        throw new ConflictException('An agency profile with that name already exists.');
      }
    }

    const existingGallery = agency?.galleryUrls ?? [];
    const retainedGallery = this.parseGalleryUrls(dto.galleryUrls, existingGallery);
    if (retainedGallery.length + images.galleryUrls.length > 20) {
      throw new BadRequestException('The agency gallery can contain up to 20 photos.');
    }
    const profile = agency ?? new this.agencyModel({ name: currentName, normalizedName: currentKey });
    profile.name = nextName;
    profile.normalizedName = nextKey;
    if (dto.description !== undefined) profile.description = dto.description.trim();
    if (dto.agencyType !== undefined) profile.agencyType = dto.agencyType.trim();
    if (dto.officeAddress !== undefined) profile.officeAddress = dto.officeAddress.trim();
    if (dto.city !== undefined) profile.city = dto.city.trim();
    if (dto.phone !== undefined) profile.phone = dto.phone.trim();
    if (dto.email !== undefined) profile.email = dto.email.trim().toLowerCase();
    if (dto.website !== undefined) profile.website = dto.website.trim();
    if (images.logoUrl) profile.logoUrl = images.logoUrl;
    if (images.coverImageUrl) profile.coverImageUrl = images.coverImageUrl;
    profile.galleryUrls = [...retainedGallery, ...images.galleryUrls];
    await profile.save();

    if (nextKey !== currentKey) {
      const escapedName = currentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await this.userModel.updateMany(
        { agencyName: { $regex: `^\\s*${escapedName}\\s*$`, $options: 'i' } },
        { $set: { agencyName: nextName } },
      ).exec();
    }

    return this.getManagedProfile(userId);
  }

  async getPublicProfile(name: string): Promise<PublicAgencyProfileResponse> {
    const requestedName = name.trim();
    if (!requestedName) throw new BadRequestException('Agency name is required.');

    const key = this.normalizeName(requestedName);
    const agency = await this.agencyModel.findOne({ normalizedName: key }).lean().exec();
    const legacyProfile = await this.usersService.findPublicAgency(agency?.name ?? requestedName);
    if (!legacyProfile) throw new NotFoundException('Agency not found.');

    return {
      ...legacyProfile,
      ...(agency
        ? {
            name: agency.name,
            description: agency.description,
            agencyType: agency.agencyType,
            officeAddress: agency.officeAddress,
            city: agency.city,
            phone: agency.phone,
            email: agency.email,
            website: agency.website,
            logoUrl: agency.logoUrl,
            coverImageUrl: agency.coverImageUrl,
            galleryUrls: agency.galleryUrls ?? [],
          }
        : { galleryUrls: [] }),
    };
  }

  async removeAgent(userId: string, agentId: string) {
    const { name, normalizedName } = await this.getManagingAgent(userId);
    if (userId === agentId) {
      throw new BadRequestException('You cannot remove your own agency association.');
    }
    const target = await this.userModel.findOne({
      _id: agentId,
      role: UserRole.AGENT,
      agencyName: this.agencyNamePattern(name),
    }).select('_id').lean().exec();
    if (!target) throw new NotFoundException('Associated agent not found.');

    await this.userModel.updateOne({ _id: target._id }, { $unset: { agencyName: 1 } }).exec();
    const directory = await this.usersService.findPublicAgency(name);
    return {
      agencyName: name,
      normalizedName,
      agentCount: directory?.agentCount ?? 0,
      removedAgentId: agentId,
    };
  }

  private async getManagingAgent(userId: string) {
    const user = await this.userModel.findOne({
      _id: userId,
      role: UserRole.AGENT,
      accountStatus: UserAccountStatus.ACTIVE,
    }).select('agencyName agencyAddress city').exec();
    if (!user) throw new ForbiddenException('An active agent account is required.');

    const name = user.agencyName?.trim();
    if (!name) throw new BadRequestException('Your agent account is not associated with an agency.');
    return { user, name, normalizedName: this.normalizeName(name) };
  }

  private normalizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private agencyNamePattern(name: string) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { $regex: `^\\s*${escapedName}\\s*$`, $options: 'i' };
  }

  private parseGalleryUrls(value: string | undefined, current: string[]): string[] {
    if (value === undefined) return current;
    let urls: unknown;
    try {
      urls = JSON.parse(value);
    } catch {
      throw new BadRequestException('Gallery selections are invalid.');
    }
    if (
      !Array.isArray(urls) ||
      urls.length > 20 ||
      urls.some((url) => typeof url !== 'string' || url.length > 2048 || !current.includes(url))
    ) {
      throw new BadRequestException('Gallery selections are invalid.');
    }
    return [...new Set(urls)];
  }
}

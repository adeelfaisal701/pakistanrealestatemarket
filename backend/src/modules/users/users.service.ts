import {
  BadRequestException,
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
} from './schemas/user.schema';
import { Agency, AgencyDocument } from '../agencies/schemas/agency.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { isAgentProfileComplete } from './agent-profile.utils';

export interface PublicAgencyRecord {
  name: string;
  agentCount: number;
  locations: string[];
  officeAddresses: string[];
  logoUrl?: string;
  coverImageUrl?: string;
}

export interface PublicAgentRecord {
  id: string;
  name: string;
  phone?: string;
  agencyName?: string;
  agencyAddress?: string;
  city?: string;
  avatarUrl?: string;
  isVerified: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Agency.name) private agencyModel: Model<AgencyDocument>,
  ) {}

  async create(createUserDto: CreateUserDto, passwordHash: string): Promise<UserDocument> {
    const createdUser = new this.userModel({
      ...createUserDto,
      passwordHash,
    });
    return createdUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.trim().toLowerCase() }).exec();
  }

  async findBuyerIdentityByEmail(
    email: string,
  ): Promise<{ id: string; role: string } | null> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('_id role')
      .lean()
      .exec();
    return user ? { id: String(user._id), role: user.role } : null;
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-passwordHash').exec();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-passwordHash').exec();
  }

  async completeAgentProfile(
    id: string,
    agencyAddress: string,
    avatarUrl?: string,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findOne({ _id: id, role: UserRole.AGENT })
      .select('-passwordHash')
      .exec();
    if (!user) throw new NotFoundException('Agent account not found.');

    if (typeof agencyAddress !== 'string' || !agencyAddress.trim()) {
      throw new BadRequestException('Estate or agency address is required.');
    }
    const normalizedAddress = agencyAddress.trim();

    const nextAvatarUrl = avatarUrl ?? user.avatarUrl;
    if (!isAgentProfileComplete({
      avatarUrl: nextAvatarUrl,
      agencyAddress: normalizedAddress,
    })) {
      throw new BadRequestException('A profile picture is required.');
    }

    user.avatarUrl = nextAvatarUrl;
    user.agencyAddress = normalizedAddress;
    await user.save();
    return user;
  }

  async findPublicAgents(): Promise<PublicAgentRecord[]> {
    const agents = await this.userModel
      .find({
        role: UserRole.AGENT,
        accountStatus: UserAccountStatus.ACTIVE,
        avatarUrl: { $type: 'string', $regex: /\S/ },
        agencyAddress: { $type: 'string', $regex: /\S/ },
      })
      .select('_id name phone agencyName city avatarUrl isVerified verificationStatus')
      .sort({ isVerified: -1, verifiedAt: -1, createdAt: -1 })
      .limit(8)
      .lean()
      .exec();

    return agents.map((agent) => this.toPublicAgent(agent, false));
  }

  async findPublicAgent(id: string): Promise<PublicAgentRecord | null> {
    const agent = await this.userModel
      .findOne({
        _id: id,
        role: UserRole.AGENT,
        accountStatus: UserAccountStatus.ACTIVE,
        avatarUrl: { $type: 'string', $regex: /\S/ },
        agencyAddress: { $type: 'string', $regex: /\S/ },
      })
      .select('_id name phone agencyName agencyAddress city avatarUrl isVerified verificationStatus')
      .lean()
      .exec();

    return agent ? this.toPublicAgent(agent) : null;
  }

  async findPublicAgencies(): Promise<PublicAgencyRecord[]> {
    const agencies = await this.userModel
      .aggregate<{
        name: string;
        agentCount: number;
        locations: string[];
        officeAddresses: string[];
      }>([
        {
          $match: {
            role: UserRole.AGENT,
            accountStatus: UserAccountStatus.ACTIVE,
            agencyName: { $type: 'string', $regex: /\S/ },
            avatarUrl: { $type: 'string', $regex: /\S/ },
            agencyAddress: { $type: 'string', $regex: /\S/ },
          },
        },
        {
          $group: {
            _id: { $toLower: { $trim: { input: '$agencyName' } } },
            name: { $first: { $trim: { input: '$agencyName' } } },
            agentCount: { $sum: 1 },
            locations: { $addToSet: '$city' },
            officeAddresses: { $addToSet: '$agencyAddress' },
          },
        },
        { $sort: { agentCount: -1, name: 1 } },
        { $limit: 8 },
        {
          $project: {
            _id: 0,
            name: 1,
            agentCount: 1,
            locations: {
              $filter: {
                input: '$locations',
                as: 'location',
                cond: { $and: [{ $ne: ['$$location', null] }, { $ne: ['$$location', ''] }] },
              },
            },
            officeAddresses: {
              $filter: {
                input: '$officeAddresses',
                as: 'address',
                cond: {
                  $and: [
                    { $ne: ['$$address', null] },
                    { $ne: ['$$address', ''] },
                  ],
                },
              },
            },
          },
        },
      ])
      .exec();

    if (!agencies.length) return agencies;

    const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
    const profiles = await this.agencyModel
      .find({ normalizedName: { $in: agencies.map(({ name }) => normalizeName(name)) } })
      .select('normalizedName logoUrl coverImageUrl')
      .lean()
      .exec();
    const profilesByName = new Map(
      profiles.map((profile) => [profile.normalizedName, profile]),
    );

    return agencies.map((agency) => {
      const profile = profilesByName.get(normalizeName(agency.name));
      return {
        ...agency,
        ...(profile?.logoUrl ? { logoUrl: profile.logoUrl } : {}),
        ...(profile?.coverImageUrl ? { coverImageUrl: profile.coverImageUrl } : {}),
      };
    });
  }

  async findPublicAgency(name: string) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = {
      role: UserRole.AGENT,
      accountStatus: UserAccountStatus.ACTIVE,
      agencyName: { $regex: `^\\s*${escapedName}\\s*$`, $options: 'i' },
      avatarUrl: { $type: 'string', $regex: /\S/ },
      agencyAddress: { $type: 'string', $regex: /\S/ },
    };
    const agents = await this.userModel
        .find(filter)
        .select('_id name phone agencyName agencyAddress city avatarUrl isVerified verificationStatus')
        .sort({ isVerified: -1, verifiedAt: -1, createdAt: -1 })
        .lean()
        .exec();

    if (agents.length === 0) return null;

    return {
      name: agents[0].agencyName?.trim() || name,
      agentCount: agents.length,
      locations: [...new Set(agents.map((agent) => agent.city?.trim()).filter(Boolean))],
      officeAddresses: [
        ...new Set(agents.map((agent) => agent.agencyAddress?.trim()).filter(Boolean)),
      ],
      agents: agents.map((agent) => this.toPublicAgent(agent)),
    };
  }

  async findPublicAgentIdsForAgency(name: string): Promise<string[]> {
    const escapedName = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!escapedName) return [];

    const agents = await this.userModel
      .find({
        role: UserRole.AGENT,
        accountStatus: UserAccountStatus.ACTIVE,
        agencyName: { $regex: `^\\s*${escapedName}\\s*$`, $options: 'i' },
        avatarUrl: { $type: 'string', $regex: /\S/ },
        agencyAddress: { $type: 'string', $regex: /\S/ },
      })
      .select('_id')
      .lean()
      .exec();
    return agents.map((agent) => String(agent._id));
  }

  private toPublicAgent(agent: {
    _id: unknown;
    name: string;
    phone?: string | null;
    agencyName?: string | null;
    agencyAddress?: string | null;
    city?: string | null;
    avatarUrl?: string | null;
    isVerified?: boolean;
    verificationStatus?: AgentVerificationStatus;
  }, includePhone = true): PublicAgentRecord {
    return {
      id: String(agent._id),
      name: agent.name,
      ...(includePhone && agent.phone?.trim() ? { phone: agent.phone.trim() } : {}),
      ...(agent.agencyName?.trim() ? { agencyName: agent.agencyName.trim() } : {}),
      ...(agent.agencyAddress?.trim()
        ? { agencyAddress: agent.agencyAddress.trim() }
        : {}),
      ...(agent.city?.trim() ? { city: agent.city.trim() } : {}),
      ...(agent.avatarUrl?.trim() ? { avatarUrl: agent.avatarUrl.trim() } : {}),
      isVerified:
        agent.isVerified === true &&
        agent.verificationStatus === AgentVerificationStatus.VERIFIED,
    };
  }
}

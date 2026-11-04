import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead, LeadDocument, LeadStatus } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';

@Injectable()
export class CrmService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
  ) {}

  async createLead(createLeadDto: CreateLeadDto, agentId: string): Promise<LeadDocument> {
    const createdLead = new this.leadModel({
      ...createLeadDto,
      agentId: new Types.ObjectId(agentId),
      propertyId: createLeadDto.propertyId ? new Types.ObjectId(createLeadDto.propertyId) : undefined,
    });
    return createdLead.save();
  }

  async getAgentLeads(agentId: string, status?: LeadStatus): Promise<LeadDocument[]> {
    const filter: Record<string, any> = {
      agentId: new Types.ObjectId(agentId),
    };
    if (status) {
      filter.status = status;
    }
    return this.leadModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async getAgentRecentActivity(agentId: string) {
    const leads = await this.leadModel
      .find({ agentId: new Types.ObjectId(agentId) })
      .sort({ updatedAt: -1 })
      .limit(20)
      .exec();
    return leads.flatMap((lead) => {
      const property = lead.propertyTitle ?? 'Lead';
      const createdAt = (lead as LeadDocument & { createdAt?: Date }).createdAt;
      const events = createdAt
        ? [{
          id: `${String(lead._id)}-created`,
          title: 'Lead added',
          description: property,
          occurredAt: createdAt,
        }]
        : [];
      if (lead.lastContactedAt) {
        events.push({
          id: `${String(lead._id)}-updated`,
          title: 'Lead updated',
          description: property,
          occurredAt: lead.lastContactedAt,
        });
      }
      return events;
    }).sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime()).slice(0, 10);
  }

  async updateLeadStatus(
    leadId: string,
    agentId: string,
    updateDto: UpdateLeadStatusDto,
  ): Promise<LeadDocument> {
    const lead = await this.leadModel.findOneAndUpdate(
      { _id: new Types.ObjectId(leadId), agentId: new Types.ObjectId(agentId) },
      {
        status: updateDto.status,
        ...(updateDto.notes ? { notes: updateDto.notes } : {}),
      },
      { new: true },
    );

    if (!lead) {
      throw new NotFoundException(`Lead with ID '${leadId}' not found for this agent`);
    }

    return lead;
  }

  async getCrmStats(agentId: string) {
    const leads = await this.leadModel.find({ agentId: new Types.ObjectId(agentId) });

    const totalLeads = leads.length;
    const newLeads = leads.filter((l) => l.status === LeadStatus.NEW).length;
    const siteVisits = leads.filter((l) => l.status === LeadStatus.SITE_VISIT_SCHEDULED).length;
    const negotiations = leads.filter((l) => l.status === LeadStatus.NEGOTIATION).length;
    const closedWon = leads.filter((l) => l.status === LeadStatus.CLOSED_WON).length;
    const lost = leads.filter((l) => l.status === LeadStatus.LOST).length;

    return {
      totalLeads,
      newLeads,
      siteVisits,
      negotiations,
      closedWon,
      lost,
    };
  }
}

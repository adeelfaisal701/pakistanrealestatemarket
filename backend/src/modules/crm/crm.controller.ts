import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CrmService } from './crm.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadStatus } from './schemas/lead.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('crm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AGENT, UserRole.ADMIN)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('leads')
  createLead(
    @Body() createLeadDto: CreateLeadDto,
    @CurrentUser('id') agentId: string,
  ) {
    return this.crmService.createLead(createLeadDto, agentId);
  }

  @Get('leads')
  getAgentLeads(
    @CurrentUser('id') agentId: string,
    @Query('status') status?: LeadStatus,
  ) {
    return this.crmService.getAgentLeads(agentId, status);
  }

  @Patch('leads/:id/status')
  updateLeadStatus(
    @Param('id') leadId: string,
    @Body() updateDto: UpdateLeadStatusDto,
    @CurrentUser('id') agentId: string,
  ) {
    return this.crmService.updateLeadStatus(leadId, agentId, updateDto);
  }

  @Get('stats')
  getCrmStats(@CurrentUser('id') agentId: string) {
    return this.crmService.getCrmStats(agentId);
  }
}

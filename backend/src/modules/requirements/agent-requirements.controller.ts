import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateRequirementOfferDto } from './dto/create-requirement-offer.dto';
import { RequirementsService } from './requirements.service';
import { VerifiedAgentGuard } from './verified-agent.guard';

@Controller('requirements/agent')
@UseGuards(JwtAuthGuard, VerifiedAgentGuard)
export class AgentRequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Get()
  list(@CurrentUser('id') agentId: string) {
    return this.requirementsService.getPublishedRequirements(agentId);
  }

  @Get('properties')
  getEligibleProperties(@CurrentUser('id') agentId: string) {
    return this.requirementsService.getEligibleProperties(agentId);
  }

  @Get('offers')
  getOffers(@CurrentUser('id') agentId: string) {
    return this.requirementsService.getAgentOffers(agentId);
  }

  @Post(':id/offers')
  createOffer(
    @CurrentUser('id') agentId: string,
    @Param('id', ParseObjectIdPipe) requirementId: string,
    @Body() dto: CreateRequirementOfferDto,
  ) {
    return this.requirementsService.createOffer(agentId, requirementId, dto);
  }
}

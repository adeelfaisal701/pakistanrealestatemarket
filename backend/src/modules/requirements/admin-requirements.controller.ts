import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { UserRole } from '../users/schemas/user.schema';
import { AdminMutationRateLimitGuard } from '../admin/admin-mutation-rate-limit.guard';
import { AdminRequirementsQueryDto } from './dto/admin-requirements-query.dto';
import { ModerateRequirementDto } from './dto/moderate-requirement.dto';
import { RequirementsService } from './requirements.service';

@Controller('requirements/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminRequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Get()
  list(@Query() query: AdminRequirementsQueryDto) {
    return this.requirementsService.getAdminRequirements(query);
  }

  @Get(':id')
  get(@Param('id', ParseObjectIdPipe) id: string) {
    return this.requirementsService.getAdminRequirement(id);
  }

  @Patch(':id/moderate')
  @UseGuards(AdminMutationRateLimitGuard)
  moderate(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ModerateRequirementDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.requirementsService.moderateRequirement(id, dto, adminId);
  }
}

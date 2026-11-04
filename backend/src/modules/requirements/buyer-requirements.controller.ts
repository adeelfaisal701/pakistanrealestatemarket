import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { UserRole } from '../users/schemas/user.schema';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementsService } from './requirements.service';

@Controller('requirements/buyer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER)
export class BuyerRequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Get()
  list(@CurrentUser('id') buyerId: string) {
    return this.requirementsService.getBuyerRequirements(buyerId);
  }

  @Post()
  create(
    @CurrentUser('id') buyerId: string,
    @Body() dto: CreateRequirementDto,
  ) {
    return this.requirementsService.createRequirement(buyerId, dto);
  }

  @Get(':id')
  get(
    @CurrentUser('id') buyerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.requirementsService.getBuyerRequirement(buyerId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') buyerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateRequirementDto,
  ) {
    return this.requirementsService.updateRequirement(buyerId, id, dto);
  }

  @Post(':id/publish')
  publish(
    @CurrentUser('id') buyerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.requirementsService.setBuyerRequirementStatus(buyerId, id, 'publish');
  }

  @Post(':id/pause')
  pause(
    @CurrentUser('id') buyerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.requirementsService.setBuyerRequirementStatus(buyerId, id, 'pause');
  }

  @Post(':id/close')
  close(
    @CurrentUser('id') buyerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.requirementsService.setBuyerRequirementStatus(buyerId, id, 'close');
  }

  @Delete(':id')
  delete(
    @CurrentUser('id') buyerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.requirementsService.deleteDraftRequirement(buyerId, id);
  }

  @Post(':id/offers/:offerId/accept')
  acceptOffer(
    @CurrentUser('id') buyerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('offerId', ParseObjectIdPipe) offerId: string,
  ) {
    return this.requirementsService.respondToOffer(buyerId, id, offerId, 'accepted');
  }

  @Post(':id/offers/:offerId/reject')
  rejectOffer(
    @CurrentUser('id') buyerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('offerId', ParseObjectIdPipe) offerId: string,
  ) {
    return this.requirementsService.respondToOffer(buyerId, id, offerId, 'rejected');
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { AdminMutationRateLimitGuard } from '../admin/admin-mutation-rate-limit.guard';
import { UserRole } from '../users/schemas/user.schema';
import {
  AdminMaintenanceQueryDto,
  AdminNoteDto,
  AdminStatusUpdateDto,
  AssignTechnicianDto,
  CreateTechnicianDto,
  RecordPaymentDto,
  TechnicianActivationDto,
  TechniciansQueryDto,
  UpdateComplaintDto,
  UpdateTechnicianDto,
  UpsertQuotationDto,
} from './dto/maintenance.dto';
import { MaintenanceService } from './maintenance.service';
import { TechnicianManagementService } from './technician-management.service';

@Controller('admin/maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminMaintenanceController {
  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly technicianService: TechnicianManagementService,
  ) {}

  @Get('overview')
  overview() {
    return this.maintenanceService.getAdminOverview();
  }

  @Get('requests')
  listRequests(@Query() query: AdminMaintenanceQueryDto) {
    return this.maintenanceService.listAdminRequests(query);
  }

  @Get('requests/:id')
  getRequest(@Param('id', ParseObjectIdPipe) id: string) {
    return this.maintenanceService.getAdminRequest(id);
  }

  @Get('requests/:id/eligible-technicians')
  eligibleTechnicians(@Param('id', ParseObjectIdPipe) id: string) {
    return this.technicianService.eligibleForRequest(id);
  }

  @Patch('requests/:id/status')
  @UseGuards(AdminMutationRateLimitGuard)
  updateStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AdminStatusUpdateDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.maintenanceService.adminUpdateStatus(adminId, id, dto);
  }

  @Post('requests/:id/assign')
  @UseGuards(AdminMutationRateLimitGuard)
  assign(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AssignTechnicianDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.maintenanceService.assignTechnician(adminId, id, dto);
  }

  @Put('requests/:id/quotation')
  @UseGuards(AdminMutationRateLimitGuard)
  upsertQuotation(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpsertQuotationDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.maintenanceService.upsertQuotation(adminId, id, dto);
  }

  @Post('requests/:id/quotation/send')
  @UseGuards(AdminMutationRateLimitGuard)
  sendQuotation(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser('id') adminId: string) {
    return this.maintenanceService.sendQuotation(adminId, id);
  }

  @Post('requests/:id/payments')
  @UseGuards(AdminMutationRateLimitGuard)
  recordPayment(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.maintenanceService.recordPayment(adminId, id, dto);
  }

  @Patch('requests/:id/complaints/:complaintId')
  @UseGuards(AdminMutationRateLimitGuard)
  updateComplaint(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('complaintId', ParseObjectIdPipe) complaintId: string,
    @Body() dto: UpdateComplaintDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.maintenanceService.updateComplaint(adminId, id, complaintId, dto);
  }

  @Post('requests/:id/notes')
  @UseGuards(AdminMutationRateLimitGuard)
  addNote(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AdminNoteDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.maintenanceService.addAdminNote(adminId, id, dto.note);
  }

  @Get('technicians')
  listTechnicians(@Query() query: TechniciansQueryDto) {
    return this.technicianService.list(query);
  }

  @Post('technicians')
  @UseGuards(AdminMutationRateLimitGuard)
  createTechnician(@Body() dto: CreateTechnicianDto, @CurrentUser('id') adminId: string) {
    return this.technicianService.create(adminId, dto);
  }

  @Get('technicians/:id')
  getTechnician(@Param('id', ParseObjectIdPipe) id: string) {
    return this.technicianService.get(id);
  }

  @Patch('technicians/:id')
  @UseGuards(AdminMutationRateLimitGuard)
  updateTechnician(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateTechnicianDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.technicianService.update(adminId, id, dto);
  }

  @Patch('technicians/:id/status')
  @UseGuards(AdminMutationRateLimitGuard)
  setTechnicianStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: TechnicianActivationDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.technicianService.setActive(adminId, id, dto);
  }
}

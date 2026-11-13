import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { AdminMutationRateLimitGuard } from '../admin/admin-mutation-rate-limit.guard';
import { UserRole } from '../users/schemas/user.schema';
import { ActiveTechnicianGuard } from './active-technician.guard';
import {
  CompleteJobDto,
  PhotoKindQueryDto,
  RejectJobDto,
  TechnicianJobsQueryDto,
  TechnicianStatusDto,
  WorkNoteDto,
} from './dto/maintenance.dto';
import {
  MAINTENANCE_IMAGE_UPLOAD_OPTIONS,
  UploadedMaintenanceImage,
} from './maintenance-image-storage.service';
import { MaintenanceService } from './maintenance.service';
import { MAX_IMAGES_PER_UPLOAD } from './maintenance.constants';

/**
 * Technician job API. Every handler is scoped in the service to jobs where
 * the caller is the assigned technician; technicians have no endpoints to
 * assign, reassign, quote, or finally complete jobs.
 */
@Controller('maintenance/technician')
@UseGuards(JwtAuthGuard, RolesGuard, ActiveTechnicianGuard)
@Roles(UserRole.TECHNICIAN)
export class TechnicianJobsController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('profile')
  profile(@CurrentUser('id') technicianId: string) {
    return this.maintenanceService.getTechnicianProfile(technicianId);
  }

  @Get('jobs')
  list(@CurrentUser('id') technicianId: string, @Query() query: TechnicianJobsQueryDto) {
    return this.maintenanceService.listTechnicianJobs(technicianId, query);
  }

  @Get('jobs/:id')
  get(@CurrentUser('id') technicianId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.maintenanceService.getTechnicianJob(technicianId, id);
  }

  @Post('jobs/:id/accept')
  accept(@CurrentUser('id') technicianId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.maintenanceService.acceptJob(technicianId, id);
  }

  @Post('jobs/:id/reject')
  reject(
    @CurrentUser('id') technicianId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: RejectJobDto,
  ) {
    return this.maintenanceService.rejectJob(technicianId, id, dto.reason);
  }

  @Post('jobs/:id/status')
  status(
    @CurrentUser('id') technicianId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: TechnicianStatusDto,
  ) {
    return this.maintenanceService.technicianUpdateStatus(technicianId, id, dto);
  }

  @UseGuards(AdminMutationRateLimitGuard)
  @Post('jobs/:id/photos')
  @UseInterceptors(
    FilesInterceptor('images', MAX_IMAGES_PER_UPLOAD, {
      storage: memoryStorage(),
      ...MAINTENANCE_IMAGE_UPLOAD_OPTIONS,
    }),
  )
  uploadPhotos(
    @CurrentUser('id') technicianId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: PhotoKindQueryDto,
    @UploadedFiles() files: UploadedMaintenanceImage[],
  ) {
    return this.maintenanceService.uploadWorkPhotos(technicianId, id, query.kind, files ?? []);
  }

  @Post('jobs/:id/notes')
  addNote(
    @CurrentUser('id') technicianId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: WorkNoteDto,
  ) {
    return this.maintenanceService.addTechnicianNote(technicianId, id, dto.note);
  }

  @Post('jobs/:id/complete')
  complete(
    @CurrentUser('id') technicianId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CompleteJobDto,
  ) {
    return this.maintenanceService.submitCompletion(technicianId, id, dto);
  }
}

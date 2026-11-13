import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { AdminMutationRateLimitGuard } from '../admin/admin-mutation-rate-limit.guard';
import { UserRole } from '../users/schemas/user.schema';
import {
  ComplaintDto,
  CreateMaintenanceRequestDto,
  CustomerRequestsQueryDto,
  FeedbackDto,
  QuotationResponseDto,
  ReasonDto,
} from './dto/maintenance.dto';
import {
  MAINTENANCE_IMAGE_UPLOAD_OPTIONS,
  UploadedMaintenanceImage,
} from './maintenance-image-storage.service';
import { MaintenanceService } from './maintenance.service';
import { MAX_IMAGES_PER_UPLOAD } from './maintenance.constants';

/**
 * Customer-facing Property Care API. Customers are buyer accounts; every
 * request lookup is scoped by the authenticated customer id in the service.
 */
@Controller('maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerMaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Public()
  @Get('categories')
  getCategories() {
    return this.maintenanceService.getCategories();
  }

  @Roles(UserRole.BUYER)
  @UseGuards(AdminMutationRateLimitGuard)
  @Post('requests')
  create(@CurrentUser('id') customerId: string, @Body() dto: CreateMaintenanceRequestDto) {
    return this.maintenanceService.createRequest(customerId, dto);
  }

  @Roles(UserRole.BUYER)
  @Get('requests')
  list(@CurrentUser('id') customerId: string, @Query() query: CustomerRequestsQueryDto) {
    return this.maintenanceService.listCustomerRequests(customerId, query);
  }

  @Roles(UserRole.BUYER)
  @Get('requests/:id')
  get(@CurrentUser('id') customerId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.maintenanceService.getCustomerRequest(customerId, id);
  }

  @Roles(UserRole.BUYER)
  @UseGuards(AdminMutationRateLimitGuard)
  @Post('requests/:id/images')
  @UseInterceptors(
    FilesInterceptor('images', MAX_IMAGES_PER_UPLOAD, {
      storage: memoryStorage(),
      ...MAINTENANCE_IMAGE_UPLOAD_OPTIONS,
    }),
  )
  uploadImages(
    @CurrentUser('id') customerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @UploadedFiles() files: UploadedMaintenanceImage[],
  ) {
    return this.maintenanceService.uploadProblemImages(customerId, id, files ?? []);
  }

  /** Authenticated, access-checked image streaming for customer, technician or admin. */
  @Roles(UserRole.BUYER, UserRole.TECHNICIAN, UserRole.ADMIN)
  @Get('requests/:id/images/:imageId')
  async getImage(
    @CurrentUser() user: { id: string; role: string },
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('imageId', ParseObjectIdPipe) imageId: string,
    @Res() response: Response,
  ) {
    const image = await this.maintenanceService.readImage(user, id, imageId);
    response.status(200).set({
      'Content-Type': image.contentType,
      'Content-Length': image.buffer.length,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    }).send(image.buffer);
  }

  @Roles(UserRole.BUYER)
  @Post('requests/:id/cancel')
  cancel(
    @CurrentUser('id') customerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ReasonDto,
  ) {
    return this.maintenanceService.cancelByCustomer(customerId, id, dto.reason);
  }

  @Roles(UserRole.BUYER)
  @Post('requests/:id/quotation/respond')
  respondToQuotation(
    @CurrentUser('id') customerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: QuotationResponseDto,
  ) {
    return this.maintenanceService.respondToQuotation(customerId, id, dto);
  }

  @Roles(UserRole.BUYER)
  @Post('requests/:id/confirm-completion')
  confirmCompletion(@CurrentUser('id') customerId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.maintenanceService.confirmCompletion(customerId, id);
  }

  @Roles(UserRole.BUYER)
  @Post('requests/:id/feedback')
  feedback(
    @CurrentUser('id') customerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: FeedbackDto,
  ) {
    return this.maintenanceService.submitFeedback(customerId, id, dto);
  }

  @Roles(UserRole.BUYER)
  @UseGuards(AdminMutationRateLimitGuard)
  @Post('requests/:id/complaints')
  complaint(
    @CurrentUser('id') customerId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ComplaintDto,
  ) {
    return this.maintenanceService.raiseComplaint(customerId, id, dto);
  }
}

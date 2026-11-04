import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Res,
  Headers,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { UserRole } from '../users/schemas/user.schema';
import { AgentAnalyticsQueryDto } from './dto/agent-analytics-query.dto';
import {
  AccessPropertyLocationDto,
  CreatePropertyLocationShareDto,
  ManagePropertyLocationDto,
} from './dto/manage-property-location.dto';
import {
  RemovePropertyImageDto,
  ReorderPropertyImagesDto,
} from './dto/manage-property-images.dto';
import type { UploadedPropertyImage } from './property-image-storage.service';
import { TrackPropertyEventDto } from './dto/track-property-event.dto';
import { UpdateAdvertisementStatusDto } from './dto/update-advertisement-status.dto';
import { UpdateInventoryStatusDto } from './dto/update-inventory-status.dto';
import {
  ArchivePropertyDto,
  RestorePropertyDto,
} from './dto/archive-property.dto';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Public()
  @Get()
  findAll(@Query() queryDto: QueryPropertyDto) {
    return this.propertiesService.findAll(queryDto);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.propertiesService.findById(id);
  }

  @Public()
  @Post(':id/view')
  trackPropertyView(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: TrackPropertyEventDto,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.propertiesService.trackPublicEvent(
      id,
      'property_view',
      body.visitorId,
      userAgent,
    );
  }

  @Public()
  @Post(':id/call-click')
  trackCallClick(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: TrackPropertyEventDto,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.propertiesService.trackPublicEvent(
      id,
      'call_click',
      body.visitorId,
      userAgent,
    );
  }

  @Public()
  @Get('images/:filename')
  async getImage(
    @Param('filename') filename: string,
    @Res() response: Response,
  ) {
    const image = await this.propertiesService.readImage(filename);
    response.status(200).set({
      'Content-Type': image.contentType,
      'Content-Length': image.buffer.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    }).send(image.buffer);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Get(':id/private-location')
  getPrivateLocation(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.propertiesService.getPrivateLocation(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Put(':id/private-location')
  savePrivateLocation(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() location: ManagePropertyLocationDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.propertiesService.savePrivateLocation(id, user, location);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Get(':id/location-shares')
  listLocationShares(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.propertiesService.listLocationShares(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Post(':id/location-shares')
  createLocationShare(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: CreatePropertyLocationShareDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.propertiesService.createLocationShare(id, user, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Delete(':id/location-shares/:shareId')
  revokeLocationShare(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('shareId', ParseObjectIdPipe) shareId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.propertiesService.revokeLocationShare(id, shareId, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('private-location/access')
  accessPrivateLocation(
    @Body() body: AccessPropertyLocationDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.propertiesService.accessPrivateLocation(body.token, user);
  }

  @Public()
  @Post(':id/whatsapp-click')
  trackWhatsAppClick(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: TrackPropertyEventDto,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.propertiesService.trackPublicEvent(
      id,
      'whatsapp_click',
      body.visitorId,
      userAgent,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Post()
  create(
    @Body() createPropertyDto: CreatePropertyDto,
    @CurrentUser('id') agentId: string,
  ) {
    return this.propertiesService.create(createPropertyDto, agentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updatePropertyDto: CreatePropertyDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.propertiesService.update(id, updatePropertyDto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Delete(':id')
  archive(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: ArchivePropertyDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.propertiesService.archive(id, user, body.confirmation);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Patch(':id/archive')
  restore(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: RestorePropertyDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.propertiesService.restore(id, user, body.confirmation);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Patch(':id/inventory-status')
  updateInventoryStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: UpdateInventoryStatusDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.propertiesService.updateInventoryStatus(id, body.status, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Post(':id/images')
  @UseInterceptors(
    FilesInterceptor('images', 1, {
      storage: memoryStorage(),
      limits: { files: 1, fileSize: 10 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
          callback(new BadRequestException('Upload a JPEG, PNG, or WebP image.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadImages(
    @Param('id', ParseObjectIdPipe) id: string,
    @UploadedFiles() files: UploadedPropertyImage[],
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.propertiesService.uploadImages(id, files ?? [], user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Put(':id/images/order')
  reorderImages(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: ReorderPropertyImagesDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.propertiesService.reorderImages(id, body.images, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Delete(':id/images')
  removeImage(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: RemovePropertyImageDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.propertiesService.removeImage(id, body.url, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Get('agent/my-listings')
  findMyListings(@CurrentUser('id') agentId: string) {
    return this.propertiesService.findByAgent(agentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Get('agent/my-ads')
  findMyAdvertisements(@CurrentUser('id') agentId: string) {
    return this.propertiesService.findAdvertisementsByAgent(agentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Get('agent/activity')
  getAgentRecentActivity(@CurrentUser('id') agentId: string) {
    return this.propertiesService.getAgentRecentActivity(agentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Post(':id/advertisement')
  submitAdvertisement(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.propertiesService.submitForAdvertising(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Put('advertisements/:id/status')
  updateAdvertisementStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: UpdateAdvertisementStatusDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.propertiesService.updateAdvertisementStatus(id, body.status, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Get('agent/analytics')
  getAgentAnalytics(
    @CurrentUser('id') agentId: string,
    @Query() query: AgentAnalyticsQueryDto,
  ) {
    return this.propertiesService.getAgentAnalytics(agentId, query.days);
  }

  /** Owner/admin view of a listing in any status (draft, pending, rejected...). */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @Get('manage/:id')
  findOneForManager(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.propertiesService.findByIdForManager(id, user);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { UserRole } from '../users/schemas/user.schema';
import { CreateBuyerInquiryDto } from './dto/create-buyer-inquiry.dto';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { UpdateBuyerProfileDto } from './dto/update-buyer-profile.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { UpdateSavedSearchDto } from './dto/update-saved-search.dto';
import { SavePropertyDto } from './dto/save-property.dto';
import { BuyerService } from './buyer.service';
import { SendPropertyMessageDto } from '../crm/dto/send-property-message.dto';

@Controller('buyer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER)
export class BuyerController {
  constructor(private readonly buyerService: BuyerService) {}

  @Get('overview')
  getOverview(@CurrentUser('id') buyerId: string) {
    return this.buyerService.getOverview(buyerId);
  }

  @Get('saved-properties')
  getSavedProperties(
    @CurrentUser('id') buyerId: string,
    @Query('sort') sort?: string,
  ) {
    return this.buyerService.getSavedProperties(buyerId, sort);
  }

  @Get('saved-properties/ids')
  getSavedPropertyIds(@CurrentUser('id') buyerId: string) {
    return this.buyerService.getSavedPropertyIds(buyerId);
  }

  @Post('saved-properties')
  addSavedProperty(
    @CurrentUser('id') buyerId: string,
    @Body() dto: SavePropertyDto,
  ) {
    return this.buyerService.addSavedProperty(buyerId, dto.propertyId);
  }

  @Delete('saved-properties/:propertyId')
  removeSavedProperty(
    @CurrentUser('id') buyerId: string,
    @Param('propertyId', ParseObjectIdPipe) propertyId: string,
  ) {
    return this.buyerService.removeSavedProperty(buyerId, propertyId);
  }

  @Get('saved-searches')
  getSavedSearches(@CurrentUser('id') buyerId: string) {
    return this.buyerService.getSavedSearches(buyerId);
  }

  @Post('saved-searches')
  createSavedSearch(
    @CurrentUser('id') buyerId: string,
    @Body() dto: CreateSavedSearchDto,
  ) {
    return this.buyerService.createSavedSearch(buyerId, dto);
  }

  @Patch('saved-searches/:id')
  updateSavedSearch(
    @CurrentUser('id') buyerId: string,
    @Param('id', ParseObjectIdPipe) searchId: string,
    @Body() dto: UpdateSavedSearchDto,
  ) {
    return this.buyerService.updateSavedSearch(buyerId, searchId, dto);
  }

  @Delete('saved-searches/:id')
  deleteSavedSearch(
    @CurrentUser('id') buyerId: string,
    @Param('id', ParseObjectIdPipe) searchId: string,
  ) {
    return this.buyerService.deleteSavedSearch(buyerId, searchId);
  }

  @Get('inquiries')
  getInquiries(@CurrentUser('id') buyerId: string) {
    return this.buyerService.getInquiries(buyerId);
  }

  @Post('inquiries')
  createInquiry(
    @CurrentUser('id') buyerId: string,
    @Body() dto: CreateBuyerInquiryDto,
  ) {
    return this.buyerService.createInquiry(buyerId, dto);
  }

  @Get('conversations/:conversationId')
  getConversation(
    @CurrentUser('id') buyerId: string,
    @Param('conversationId', ParseObjectIdPipe) conversationId: string,
  ) {
    return this.buyerService.getConversation(buyerId, conversationId);
  }

  @Get('conversations/:conversationId/messages')
  getMessages(
    @CurrentUser('id') buyerId: string,
    @Param('conversationId', ParseObjectIdPipe) conversationId: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.buyerService.getMessages(buyerId, conversationId, before, limit);
  }

  @Post('conversations/:conversationId/messages')
  sendMessage(
    @CurrentUser('id') buyerId: string,
    @Param('conversationId', ParseObjectIdPipe) conversationId: string,
    @Body() dto: SendPropertyMessageDto,
  ) {
    return this.buyerService.sendMessage(
      buyerId,
      conversationId,
      dto.content,
      dto.idempotencyKey,
    );
  }

  @Get('recommendations')
  getRecommendations(@CurrentUser('id') buyerId: string) {
    return this.buyerService.getRecommendations(buyerId);
  }

  @Get('notifications')
  getNotifications(
    @CurrentUser('id') buyerId: string,
    @Query('limit') limit?: string,
  ) {
    return this.buyerService.getNotifications(buyerId, Number(limit));
  }

  @Patch('notifications/:id/read')
  markNotificationRead(
    @CurrentUser('id') buyerId: string,
    @Param('id', ParseObjectIdPipe) notificationId: string,
  ) {
    return this.buyerService.markNotificationRead(buyerId, notificationId);
  }

  @Post('notifications/read-all')
  markAllNotificationsRead(@CurrentUser('id') buyerId: string) {
    return this.buyerService.markAllNotificationsRead(buyerId);
  }

  @Get('profile')
  getProfile(@CurrentUser('id') buyerId: string) {
    return this.buyerService.getProfile(buyerId);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser('id') buyerId: string,
    @Body() dto: UpdateBuyerProfileDto,
  ) {
    return this.buyerService.updateProfile(buyerId, dto);
  }

  @Get('preferences/notifications')
  getNotificationPreferences(@CurrentUser('id') buyerId: string) {
    return this.buyerService.getNotificationPreferences(buyerId);
  }

  @Patch('preferences/notifications')
  updateNotificationPreferences(
    @CurrentUser('id') buyerId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.buyerService.updateNotificationPreferences(buyerId, dto);
  }
}

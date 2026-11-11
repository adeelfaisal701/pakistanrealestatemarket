import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ModeratePropertyDto } from './dto/moderate-property.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { UserRole } from '../users/schemas/user.schema';
import { AdminPropertiesQueryDto } from './dto/admin-properties-query.dto';
import { AdminAgentsQueryDto } from './dto/admin-agents-query.dto';
import { AdminAdsQueryDto } from './dto/admin-ads-query.dto';
import { AdminActivityQueryDto } from './dto/admin-activity-query.dto';
import {
  AdminAccountStatusDto,
  AdminAdvertisementActionDto,
  AdminAgentActionDto,
  AdminPropertyActionDto,
} from './dto/admin-action.dto';
import { AdminDeleteDto } from './dto/admin-delete.dto';
import { UpdateUserReportDto } from './dto/user-report.dto';
import { AdminMutationRateLimitGuard } from './admin-mutation-rate-limit.guard';
import { AdminBuyerUpdateDto } from './dto/admin-buyer-update.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('properties')
  getProperties(@Query() query: AdminPropertiesQueryDto) {
    return this.adminService.getAdminProperties(query);
  }

  @Get('properties/pending')
  getPendingProperties() {
    return this.adminService.getPendingProperties();
  }

  @Patch('properties/:id/moderate')
  @UseGuards(AdminMutationRateLimitGuard)
  moderateProperty(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() moderateDto: ModeratePropertyDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.moderateProperty(id, moderateDto, adminId);
  }

  @Patch('agents/:id/verify')
  @UseGuards(AdminMutationRateLimitGuard)
  verifyAgent(
    @Param('id', ParseObjectIdPipe) userId: string,
    @Body() body: AdminAgentActionDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.verifyAgent(userId, adminId, body.reason);
  }

  @Get('agents')
  getAgents(@Query() query: AdminAgentsQueryDto) {
    return this.adminService.getAgents(query);
  }

  @Get('buyers')
  getBuyerAccounts(@Query() query: AdminAgentsQueryDto) {
    return this.adminService.getBuyerAccounts(query);
  }

  @Get('buyers/:id')
  getBuyerAccount(@Param('id', ParseObjectIdPipe) userId: string) {
    return this.adminService.getBuyerAccount(userId);
  }

  @Patch('buyers/:id')
  @UseGuards(AdminMutationRateLimitGuard)
  updateBuyerAccount(
    @Param('id', ParseObjectIdPipe) userId: string,
    @Body() body: AdminBuyerUpdateDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateBuyerAccount(userId, body, adminId);
  }

  @Patch('buyers/:id/account-status')
  @UseGuards(AdminMutationRateLimitGuard)
  updateBuyerAccountStatus(
    @Param('id', ParseObjectIdPipe) userId: string,
    @Body() body: AdminAccountStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateBuyerAccountStatus(userId, body, adminId);
  }

  @Delete('buyers/:id')
  @UseGuards(AdminMutationRateLimitGuard)
  deleteBuyer(
    @Param('id', ParseObjectIdPipe) userId: string,
    @Body() body: AdminDeleteDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.deleteBuyer(userId, body, adminId);
  }

  @Get('agents/:id')
  getAgentProfile(@Param('id', ParseObjectIdPipe) userId: string) {
    return this.adminService.getAgentProfile(userId);
  }

  @Get('agencies')
  getAgencies(@Query() query: AdminAgentsQueryDto) {
    return this.adminService.getAdminAgencies(query);
  }

  @Patch('agents/:id/unverify')
  @UseGuards(AdminMutationRateLimitGuard)
  unverifyAgent(
    @Param('id', ParseObjectIdPipe) userId: string,
    @Body() body: AdminAgentActionDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.unverifyAgent(userId, body.reason, adminId);
  }

  @Patch('agents/:id/reject-verification')
  @UseGuards(AdminMutationRateLimitGuard)
  rejectAgentVerification(
    @Param('id', ParseObjectIdPipe) userId: string,
    @Body() body: AdminAgentActionDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.rejectAgentVerification(
      userId,
      body.reason,
      adminId,
    );
  }

  @Patch('agents/:id/account-status')
  @UseGuards(AdminMutationRateLimitGuard)
  updateAgentAccountStatus(
    @Param('id', ParseObjectIdPipe) userId: string,
    @Body() body: AdminAccountStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateAgentAccountStatus(userId, body, adminId);
  }

  @Delete('agents/:id')
  @UseGuards(AdminMutationRateLimitGuard)
  deleteAgent(
    @Param('id', ParseObjectIdPipe) userId: string,
    @Body() body: AdminDeleteDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.deleteAgent(userId, body, adminId);
  }

  @Patch('properties/:id/action')
  @UseGuards(AdminMutationRateLimitGuard)
  moderatePropertyAction(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: AdminPropertyActionDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.adminPropertyAction(id, body, adminId);
  }

  @Delete('properties/:id')
  @UseGuards(AdminMutationRateLimitGuard)
  deleteProperty(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: AdminDeleteDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.deleteProperty(id, body, adminId);
  }

  @Get('advertisements')
  getAdvertisements(@Query() query: AdminAdsQueryDto) {
    return this.adminService.getAdminAdvertisements(query);
  }

  @Patch('advertisements/:id/action')
  @UseGuards(AdminMutationRateLimitGuard)
  updateAdvertisement(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: AdminAdvertisementActionDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.adminAdvertisementAction(id, body, adminId);
  }

  @Get('reports')
  getReports(@Query() query: AdminActivityQueryDto) {
    return this.adminService.getUserReports(query);
  }

  @Patch('reports/:id')
  @UseGuards(AdminMutationRateLimitGuard)
  updateReport(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: UpdateUserReportDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateUserReport(id, body, adminId);
  }

  @Get('activity')
  getActivity(@Query() query: AdminActivityQueryDto) {
    return this.adminService.getActivityLog(query);
  }

  @Get('stats')
  getAdminStats() {
    return this.adminService.getAdminStats();
  }
}

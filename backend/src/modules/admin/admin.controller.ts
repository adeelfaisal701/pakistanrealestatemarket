import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ModeratePropertyDto } from './dto/moderate-property.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('properties/pending')
  getPendingProperties() {
    return this.adminService.getPendingProperties();
  }

  @Patch('properties/:id/moderate')
  moderateProperty(
    @Param('id') id: string,
    @Body() moderateDto: ModeratePropertyDto,
  ) {
    return this.adminService.moderateProperty(id, moderateDto);
  }

  @Patch('agents/:id/verify')
  verifyAgent(@Param('id') userId: string) {
    return this.adminService.verifyAgent(userId);
  }

  @Get('stats')
  getAdminStats() {
    return this.adminService.getAdminStats();
  }
}

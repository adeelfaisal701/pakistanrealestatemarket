import {
  Controller,
  BadRequestException,
  Body,
  ForbiddenException,
  Get,
  NotFoundException,
  Patch,
  Param,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { UserRole } from './schemas/user.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { Public } from '../../common/decorators/public.decorator';
import { CompleteAgentProfileDto } from './dto/complete-agent-profile.dto';
import { PropertyImageStorageService, type UploadedPropertyImage } from '../properties/property-image-storage.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly imageStorage: PropertyImageStorageService,
  ) {}

  @Public()
  @Get('public/featured-agents')
  getFeaturedAgents() {
    return this.usersService.findPublicAgents(8);
  }

  @Public()
  @Get('public/agents')
  getPublicAgents() {
    return this.usersService.findPublicAgents();
  }

  @Public()
  @Get('public/featured-agencies')
  getFeaturedAgencies() {
    return this.usersService.findPublicAgencies();
  }

  @Public()
  @Get('public/agents/:id')
  async getPublicAgent(@Param('id', ParseObjectIdPipe) id: string) {
    const agent = await this.usersService.findPublicAgent(id);
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  @Public()
  @Get('public/agencies')
  async getPublicAgency(@Query('name') name?: string) {
    if (!name?.trim()) return this.usersService.findPublicAgencies();
    const agency = await this.usersService.findPublicAgency(name.trim());
    if (!agency) throw new NotFoundException('Agency not found');
    return agency;
  }

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Patch('agent/profile')
  @UseInterceptors(
    FileInterceptor('avatar', {
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
  async completeAgentProfile(
    @CurrentUser() user: { id: string; role: string },
    @Body() body: CompleteAgentProfileDto,
    @UploadedFile() file?: UploadedPropertyImage,
  ) {
    if (user.role !== UserRole.AGENT) {
      throw new ForbiddenException('Only agents can complete an agent profile.');
    }

    const uploaded = file ? await this.imageStorage.save(file) : undefined;
    try {
      return await this.usersService.completeAgentProfile(
        user.id,
        body.agencyAddress,
        uploaded?.url,
      );
    } catch (error) {
      if (uploaded) {
        const filename = this.imageStorage.filenameForManagedUrl(uploaded.url);
        if (filename) await this.imageStorage.remove(filename);
      }
      throw error;
    }
  }

  /**
   * A user may read their own record; only admins may read someone else's.
   * The requester's role is re-read from the database (not trusted from the
   * JWT payload) for this privileged check.
   */
  @Get(':id')
  async getUserById(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() requester: { id: string },
  ) {
    if (String(requester.id) !== id) {
      const me = await this.usersService.findById(requester.id);
      if (!me || me.role !== UserRole.ADMIN) {
        throw new ForbiddenException('You are not allowed to access this resource');
      }
    }

    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}

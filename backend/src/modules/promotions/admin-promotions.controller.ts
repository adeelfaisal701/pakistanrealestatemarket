import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { UserRole } from '../users/schemas/user.schema';
import { AdminMutationRateLimitGuard } from '../admin/admin-mutation-rate-limit.guard';
import {
  PropertyImageStorageService,
  type UploadedPropertyImage,
} from '../properties/property-image-storage.service';
import {
  PromoAnalyticsQueryDto,
  PromoCampaignDto,
  PromoListQueryDto,
  PromoSettingsDto,
  PromoStatusDto,
} from './dto/promo-campaign.dto';
import { PromoMediaStorageService } from './promo-media-storage.service';
import { PromotionsService } from './promotions.service';
import { PROMO_LIMITS } from './promotion.constants';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];

/** Sponsored campaign management — administrators only. */
@Controller('admin/promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPromotionsController {
  constructor(
    private readonly promotions: PromotionsService,
    private readonly images: PropertyImageStorageService,
    private readonly videos: PromoMediaStorageService,
  ) {}

  @Get()
  list(@Query() query: PromoListQueryDto) {
    return this.promotions.list(query);
  }

  @Get('analytics')
  analytics(@Query() query: PromoAnalyticsQueryDto) {
    return this.promotions.analytics(query);
  }

  @Get('settings')
  settings() {
    return this.promotions.getSettings();
  }

  @Put('settings')
  @UseGuards(AdminMutationRateLimitGuard)
  updateSettings(@Body() dto: PromoSettingsDto) {
    return this.promotions.updateSettings(dto);
  }

  /** Uploads one image (JPEG/PNG/WebP, re-encoded) or video (MP4/WebM). */
  @Post('media')
  @UseGuards(AdminMutationRateLimitGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { files: 1, fileSize: PROMO_LIMITS.maxVideoBytes },
      fileFilter: (_request, file, callback) => {
        if (![...IMAGE_TYPES, ...VIDEO_TYPES].includes(file.mimetype)) {
          callback(new BadRequestException('Upload a JPEG, PNG or WebP image, or an MP4 or WebM video.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file?: UploadedPropertyImage) {
    if (!file) throw new BadRequestException('Choose a file to upload.');
    if (VIDEO_TYPES.includes(file.mimetype)) {
      const saved = await this.videos.saveVideo(file);
      return { kind: 'video', url: saved.url, contentType: saved.contentType, size: saved.size };
    }
    if (file.size > PROMO_LIMITS.maxImageBytes) throw new BadRequestException('Images must be 10 MB or smaller.');
    const saved = await this.images.save(file);
    return { kind: 'image', url: saved.url, contentType: saved.contentType, size: saved.size };
  }

  @Get(':id')
  get(@Param('id', ParseObjectIdPipe) id: string) {
    return this.promotions.get(id);
  }

  @Post()
  @UseGuards(AdminMutationRateLimitGuard)
  create(@Body() dto: PromoCampaignDto, @CurrentUser('id') adminId: string) {
    return this.promotions.create(dto, adminId);
  }

  @Put(':id')
  @UseGuards(AdminMutationRateLimitGuard)
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: PromoCampaignDto, @CurrentUser('id') adminId: string) {
    return this.promotions.update(id, dto, adminId);
  }

  @Post(':id/duplicate')
  @UseGuards(AdminMutationRateLimitGuard)
  duplicate(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser('id') adminId: string) {
    return this.promotions.duplicate(id, adminId);
  }

  @Patch(':id/status')
  @UseGuards(AdminMutationRateLimitGuard)
  setStatus(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: PromoStatusDto, @CurrentUser('id') adminId: string) {
    return this.promotions.setStatus(id, dto.status, adminId);
  }

  @Delete(':id')
  @UseGuards(AdminMutationRateLimitGuard)
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.promotions.remove(id);
  }
}

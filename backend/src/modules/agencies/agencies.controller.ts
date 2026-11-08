import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { PropertyImageStorageService, type UploadedPropertyImage } from '../properties/property-image-storage.service';
import {
  AgenciesService,
  type ManagedAgencyProfileResponse,
  type PublicAgencyProfileResponse,
} from './agencies.service';
import { UpdateAgencyProfileDto } from './dto/update-agency-profile.dto';

type AgencyImageFields = {
  logo?: UploadedPropertyImage[];
  cover?: UploadedPropertyImage[];
  gallery?: UploadedPropertyImage[];
};

@Controller('agencies')
@UseGuards(JwtAuthGuard)
export class AgenciesController {
  constructor(
    private readonly agenciesService: AgenciesService,
    private readonly imageStorage: PropertyImageStorageService,
  ) {}

  @Public()
  @Get('public')
  getPublicAgency(@Query('name') name = ''): Promise<PublicAgencyProfileResponse> {
    return this.agenciesService.getPublicProfile(name);
  }

  @Get('manage/profile')
  getManagedProfile(
    @CurrentUser('id') userId: string,
  ): Promise<ManagedAgencyProfileResponse> {
    return this.agenciesService.getManagedProfile(userId);
  }

  @Patch('manage/profile')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
        { name: 'gallery', maxCount: 20 },
      ],
      {
        storage: memoryStorage(),
        limits: { files: 22, fileSize: 10 * 1024 * 1024 },
        fileFilter: (_request, file, callback) => {
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            callback(new BadRequestException('Upload JPEG, PNG, or WebP images.'), false);
            return;
          }
          callback(null, true);
        },
      },
    ),
  )
  async updateManagedProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAgencyProfileDto,
    @UploadedFiles() files: AgencyImageFields,
  ): Promise<ManagedAgencyProfileResponse> {
    const saved: string[] = [];
    try {
      const logo = files?.logo?.[0] ? await this.imageStorage.save(files.logo[0]) : undefined;
      if (logo) saved.push(logo.url);
      const cover = files?.cover?.[0] ? await this.imageStorage.save(files.cover[0]) : undefined;
      if (cover) saved.push(cover.url);
      const gallery: string[] = [];
      for (const file of files?.gallery ?? []) {
        const image = await this.imageStorage.save(file);
        saved.push(image.url);
        gallery.push(image.url);
      }

      return await this.agenciesService.updateManagedProfile(userId, dto, {
        logoUrl: logo?.url,
        coverImageUrl: cover?.url,
        galleryUrls: gallery,
      });
    } catch (error) {
      for (const url of saved) {
        const filename = this.imageStorage.filenameForManagedUrl(url);
        if (filename) await this.imageStorage.remove(filename);
      }
      throw error;
    }
  }

  @Delete('manage/agents/:id')
  removeAgent(
    @CurrentUser('id') userId: string,
    @Param('id', ParseObjectIdPipe) agentId: string,
  ) {
    return this.agenciesService.removeAgent(userId, agentId);
  }
}

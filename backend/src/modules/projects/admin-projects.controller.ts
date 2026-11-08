import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { UserRole } from '../users/schemas/user.schema';
import { AdminMutationRateLimitGuard } from '../admin/admin-mutation-rate-limit.guard';
import {
  ProjectPayloadDto,
} from './dto/project-payload.dto';
import {
  ProjectDocumentStorageService,
  type UploadedProjectDocument,
} from './project-document-storage.service';
import { ProjectsService } from './projects.service';
import {
  PropertyImageStorageService,
  type UploadedPropertyImage,
} from '../properties/property-image-storage.service';

type ProjectUploadFields = {
  cover?: UploadedPropertyImage[];
  gallery?: UploadedPropertyImage[];
  paymentPlanFile?: UploadedProjectDocument[];
};

const ProjectUploadInterceptor = FileFieldsInterceptor(
  [
    { name: 'cover', maxCount: 1 },
    { name: 'gallery', maxCount: 20 },
    { name: 'paymentPlanFile', maxCount: 1 },
  ],
  {
    storage: memoryStorage(),
    limits: { files: 22, fileSize: 10 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      const validImage = ['image/jpeg', 'image/png', 'image/webp'].includes(
        file.mimetype,
      );
      const validPaymentPlan = file.mimetype === 'application/pdf' || validImage;
      if (
        (file.fieldname === 'paymentPlanFile' && !validPaymentPlan) ||
        (file.fieldname !== 'paymentPlanFile' && !validImage)
      ) {
        callback(
          new BadRequestException(
            file.fieldname === 'paymentPlanFile'
              ? 'Upload a PDF or JPEG, PNG, or WebP payment plan.'
              : 'Upload JPEG, PNG, or WebP project images.',
          ),
          false,
        );
        return;
      }
      callback(null, true);
    },
  },
);

@Controller('admin/projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly imageStorage: PropertyImageStorageService,
    private readonly documentStorage: ProjectDocumentStorageService,
  ) {}

  @Get()
  list() {
    return this.projectsService.listAdmin();
  }

  @Get(':id')
  get(@Param('id', ParseObjectIdPipe) id: string) {
    return this.projectsService.getAdmin(id);
  }

  @Post()
  @UseGuards(AdminMutationRateLimitGuard)
  @UseInterceptors(ProjectUploadInterceptor)
  async create(
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files: ProjectUploadFields,
  ) {
    return this.saveProject(this.parsePayload(body), files);
  }

  @Patch(':id')
  @UseGuards(AdminMutationRateLimitGuard)
  @UseInterceptors(ProjectUploadInterceptor)
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files: ProjectUploadFields,
  ) {
    return this.saveProject(this.parsePayload(body), files, id);
  }

  @Delete(':id')
  @UseGuards(AdminMutationRateLimitGuard)
  delete(@Param('id', ParseObjectIdPipe) id: string) {
    return this.projectsService.delete(id);
  }

  private async saveProject(
    payload: ProjectPayloadDto,
    files: ProjectUploadFields,
    id?: string,
  ) {
    const savedImages: string[] = [];
    let savedDocument: string | undefined;
    try {
      if (files?.paymentPlanFile?.[0] && !payload.paymentPlan.enabled) {
        throw new BadRequestException(
          'Enable the project payment plan before uploading its document.',
        );
      }
      if (files?.cover?.[0]) {
        const cover = await this.imageStorage.save(files.cover[0]);
        savedImages.push(cover.url);
        payload.coverImage = cover.url;
      }
      const gallery: string[] = [];
      for (const file of files?.gallery ?? []) {
        const image = await this.imageStorage.save(file);
        savedImages.push(image.url);
        gallery.push(image.url);
      }
      payload.gallery = [...new Set([...(payload.gallery ?? []), ...gallery])];

      if (files?.paymentPlanFile?.[0]) {
        const uploadedPaymentPlan = files.paymentPlanFile[0];
        if (uploadedPaymentPlan.mimetype === 'application/pdf') {
          const document = await this.documentStorage.save(uploadedPaymentPlan);
          savedDocument = document.url;
          payload.paymentPlan.documentUrl = document.url;
        } else {
          const image = await this.imageStorage.save(uploadedPaymentPlan);
          savedImages.push(image.url);
          payload.paymentPlan.documentUrl =
            this.documentStorage.urlForManagedFilename(image.filename);
        }
      }

      return id
        ? await this.projectsService.update(id, payload)
        : await this.projectsService.create(payload);
    } catch (error) {
      for (const url of savedImages) {
        const filename = this.imageStorage.filenameForManagedUrl(url);
        if (filename) await this.imageStorage.remove(filename);
      }
      if (savedDocument) await this.documentStorage.remove(savedDocument);
      throw error;
    }
  }

  private parsePayload(body: Record<string, unknown>): ProjectPayloadDto {
    let value: unknown = body?.project ?? body;
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        throw new BadRequestException('Project data must be valid JSON.');
      }
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Project data must be an object.');
    }
    const payload = plainToInstance(ProjectPayloadDto, value);
    const errors = validateSync(payload, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });
    if (errors.length) {
      throw new BadRequestException('Project data is invalid.');
    }
    if (
      !payload.additionalInformation ||
      Object.values(payload.additionalInformation).some(
        (item) => typeof item !== 'string',
      )
    ) {
      throw new BadRequestException('Additional project information must contain text values.');
    }
    return payload;
  }

}

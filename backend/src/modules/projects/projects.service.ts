import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProjectPayloadDto } from './dto/project-payload.dto';
import {
  DevelopmentProject,
  DevelopmentProjectDocument,
} from './schemas/development-project.schema';
import { ProjectDocumentStorageService } from './project-document-storage.service';
import { PropertyImageStorageService } from '../properties/property-image-storage.service';
import { Property, PropertyDocument } from '../properties/schemas/property.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Agency, AgencyDocument } from '../agencies/schemas/agency.schema';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectModel(DevelopmentProject.name)
    private readonly projectModel: Model<DevelopmentProjectDocument>,
    private readonly documentStorage: ProjectDocumentStorageService,
    private readonly imageStorage: PropertyImageStorageService,
    @Optional() @InjectModel(Property.name)
    private readonly propertyModel?: Model<PropertyDocument>,
    @Optional() @InjectModel(User.name)
    private readonly userModel?: Model<UserDocument>,
    @Optional() @InjectModel(Agency.name)
    private readonly agencyModel?: Model<AgencyDocument>,
  ) {}

  async listAdmin() {
    const projects = await this.projectModel
      .find({})
      .sort({ displayOrder: 1, updatedAt: -1 })
      .exec();
    return projects.map((project) => this.serialize(project));
  }

  async getAdmin(id: string) {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Project not found.');
    return this.serialize(project);
  }

  async create(payload: ProjectPayloadDto) {
    try {
      const project = await this.projectModel.create(this.normalize(payload));
      return this.serialize(project);
    } catch (error) {
      if (this.isDuplicateKey(error)) {
        throw new ConflictException('A project with this slug already exists.');
      }
      throw error;
    }
  }

  async update(id: string, payload: ProjectPayloadDto) {
    const previous = await this.projectModel.findById(id).exec();
    if (!previous) throw new NotFoundException('Project not found.');
    const previousMedia = this.mediaUrls(previous);
    try {
      const project = await this.projectModel
        .findByIdAndUpdate(id, this.normalize(payload), {
          new: true,
          runValidators: true,
        })
        .exec();
      if (!project) throw new NotFoundException('Project not found.');
      const currentMedia = new Set(this.mediaUrls(project));
      await this.removeUnreferencedMedia(
        previousMedia.filter((url) => !currentMedia.has(url)),
      );
      return this.serialize(project);
    } catch (error) {
      if (this.isDuplicateKey(error)) {
        throw new ConflictException('A project with this slug already exists.');
      }
      throw error;
    }
  }

  async delete(id: string) {
    const project = await this.projectModel.findByIdAndDelete(id).exec();
    if (!project) throw new NotFoundException('Project not found.');
    await this.removeUnreferencedMedia(this.mediaUrls(project));
    return { id: String(project._id), deleted: true };
  }

  async listPublished(featuredOnly = false) {
    const filter = featuredOnly
      ? { isPublished: true, isFeatured: true }
      : { isPublished: true };
    const projects = await this.projectModel
      .find(filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .exec();
    return projects.map((project) => this.serialize(project));
  }

  async getPublished(identifier: string) {
    const query: Record<string, unknown> = {
      isPublished: true,
      $or: [{ slug: identifier }],
    };
    if (Types.ObjectId.isValid(identifier)) {
      (query.$or as Record<string, unknown>[]).push({
        _id: new Types.ObjectId(identifier),
      });
    }
    const project = await this.projectModel.findOne(query).exec();
    if (!project) throw new NotFoundException('Project not found.');
    return this.serialize(project);
  }

  async readPublishedDocument(filename: string) {
    const url = this.documentStorage.urlForManagedFilename(filename);
    const project = await this.projectModel
      .findOne({
        isPublished: true,
        'paymentPlan.enabled': true,
        'paymentPlan.documentUrl': url,
      })
      .select('_id')
      .exec();
    if (!project) throw new NotFoundException('Project document not found.');
    if (filename.endsWith('.pdf')) {
      return {
        buffer: await this.documentStorage.read(filename),
        contentType: 'application/pdf',
      };
    }
    return this.imageStorage.read(filename);
  }

  private mediaUrls(project: DevelopmentProjectDocument): string[] {
    return [...new Set([
      project.coverImage,
      ...(project.gallery ?? []),
      project.paymentPlan?.documentUrl,
    ].filter((url): url is string => Boolean(url)))];
  }

  private async removeUnreferencedMedia(urls: string[]): Promise<void> {
    for (const url of urls) {
      const imageFilename = this.imageStorage.filenameForManagedUrl(url);
      const documentFilename = this.documentStorage.filenameForManagedUrl(url);
      if (!imageFilename && !documentFilename) continue;

      if (!this.propertyModel || !this.userModel || !this.agencyModel) {
        this.logger.warn('Project media cleanup skipped because reference checks are unavailable.');
        continue;
      }

      const [projectReference, propertyReference, userReference, agencyReference] =
        await Promise.all([
          this.projectModel
            .findOne({
              $or: [
                { coverImage: url },
                { gallery: url },
                { 'paymentPlan.documentUrl': url },
              ],
            })
            .select('_id')
            .exec(),
          this.propertyModel
            .findOne({ $or: [{ images: url }, { 'imageMetadata.url': url }] })
            .select('_id')
            .exec(),
          this.userModel.findOne({ avatarUrl: url }).select('_id').exec(),
          this.agencyModel
            .findOne({
              $or: [
                { logoUrl: url },
                { coverImageUrl: url },
                { galleryUrls: url },
              ],
            })
            .select('_id')
            .exec(),
        ]);
      if (projectReference || propertyReference || userReference || agencyReference) {
        continue;
      }

      try {
        if (url.endsWith('.pdf')) {
          await this.documentStorage.remove(url);
        } else {
          const filename = imageFilename ?? documentFilename;
          if (filename) await this.imageStorage.remove(filename);
        }
      } catch {
        this.logger.warn('Project media cleanup failed; a managed file may need later review.');
      }
    }
  }

  private normalize(payload: ProjectPayloadDto) {
    const paymentPlan = payload.paymentPlan?.enabled
      ? {
          ...payload.paymentPlan,
          milestones: payload.paymentPlan.milestones ?? [],
        }
      : { enabled: false, milestones: [] };
    const additionalInformation = Object.fromEntries(
      Object.entries(payload.additionalInformation ?? {})
        .map(([key, value]) => [key.trim().slice(0, 80), String(value).trim().slice(0, 1000)])
        .filter(([key, value]) => Boolean(key) && Boolean(value)),
    );
    return {
      ...payload,
      slug: payload.slug.trim().toLowerCase(),
      name: payload.name.trim(),
      developer: payload.developer.trim(),
      shortDescription: payload.shortDescription.trim(),
      description: payload.description.trim(),
      location: payload.location.trim(),
      projectType: payload.projectType.trim(),
      categories: payload.categories.map((value) => value.trim()).filter(Boolean),
      gallery: [...new Set(payload.gallery)],
      amenities: payload.amenities.map((value) => value.trim()).filter(Boolean),
      additionalInformation,
      paymentPlan,
    };
  }

  private serialize(project: DevelopmentProjectDocument) {
    const record = project.toObject();
    return {
      id: String(project._id),
      name: record.name,
      developer: record.developer,
      slug: record.slug,
      shortDescription: record.shortDescription,
      description: record.description,
      location: record.location,
      projectType: record.projectType,
      categories: record.categories ?? [],
      priceRange: record.priceRange,
      status: record.status,
      coverImage: record.coverImage,
      gallery: record.gallery ?? [],
      amenities: record.amenities ?? [],
      additionalInformation:
        record.additionalInformation instanceof Map
          ? Object.fromEntries(record.additionalInformation)
          : record.additionalInformation ?? {},
      paymentPlan: record.paymentPlan ?? { enabled: false },
      isPublished: record.isPublished,
      isFeatured: record.isFeatured,
      displayOrder: record.displayOrder,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private isDuplicateKey(error: unknown): boolean {
    return Boolean(
      error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 11000,
    );
  }
}

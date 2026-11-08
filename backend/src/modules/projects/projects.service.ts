import {
  ConflictException,
  Injectable,
  NotFoundException,
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

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(DevelopmentProject.name)
    private readonly projectModel: Model<DevelopmentProjectDocument>,
    private readonly documentStorage: ProjectDocumentStorageService,
    private readonly imageStorage: PropertyImageStorageService,
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
    try {
      const project = await this.projectModel
        .findByIdAndUpdate(id, this.normalize(payload), {
          new: true,
          runValidators: true,
        })
        .exec();
      if (!project) throw new NotFoundException('Project not found.');
      if (previous.paymentPlan?.documentUrl !== project.paymentPlan?.documentUrl) {
        await this.removeUnreferencedPaymentDocument(
          previous.paymentPlan?.documentUrl,
        );
      }
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
    await this.removeUnreferencedPaymentDocument(
      project.paymentPlan?.documentUrl,
    );
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

  private async removeUnreferencedPaymentDocument(url?: string) {
    if (!url) return;
    const filename = this.documentStorage.filenameForManagedUrl(url);
    if (!filename) return;
    const stillReferenced = await this.projectModel
      .findOne({
        $or: [
          { coverImage: url },
          { gallery: url },
          { 'paymentPlan.documentUrl': url },
        ],
      })
      .select('_id')
      .exec();
    if (stillReferenced) return;
    if (filename.endsWith('.pdf')) {
      await this.documentStorage.remove(url);
    } else {
      await this.imageStorage.remove(filename);
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

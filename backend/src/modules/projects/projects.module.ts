import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminMutationRateLimitGuard } from '../admin/admin-mutation-rate-limit.guard';
import { PropertyImageStorageService } from '../properties/property-image-storage.service';
import { AdminProjectsController } from './admin-projects.controller';
import { ProjectDocumentStorageService } from './project-document-storage.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import {
  DevelopmentProject,
  DevelopmentProjectSchema,
} from './schemas/development-project.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DevelopmentProject.name, schema: DevelopmentProjectSchema },
    ]),
  ],
  controllers: [AdminProjectsController, ProjectsController],
  providers: [
    ProjectsService,
    PropertyImageStorageService,
    ProjectDocumentStorageService,
    AdminMutationRateLimitGuard,
  ],
})
export class ProjectsModule {}

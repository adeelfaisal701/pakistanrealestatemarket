import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Public()
  @Get('featured')
  getFeatured() {
    return this.projectsService.listPublished(true);
  }

  @Public()
  @Get()
  getPublishedProjects() {
    return this.projectsService.listPublished();
  }

  @Public()
  @Get('media/:filename')
  async getPaymentPlanDocument(
    @Param('filename') filename: string,
    @Res() response: Response,
  ) {
    const { buffer, contentType } =
      await this.projectsService.readPublishedDocument(filename);
    response
      .set({
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Content-Length': buffer.length,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      })
      .send(buffer);
  }

  @Public()
  @Get(':slug')
  getPublishedProject(@Param('slug') slug: string) {
    return this.projectsService.getPublished(slug);
  }
}

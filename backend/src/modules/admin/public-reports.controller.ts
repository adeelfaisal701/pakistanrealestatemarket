import { Body, Controller, Ip, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AdminService } from './admin.service';
import { CreateUserReportDto } from './dto/user-report.dto';

@Controller('reports')
export class PublicReportsController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Post()
  createReport(@Body() body: CreateUserReportDto, @Ip() ip: string) {
    return this.adminService.createUserReport(body, ip);
  }
}

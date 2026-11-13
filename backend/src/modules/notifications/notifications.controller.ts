import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { NotificationsService } from './notifications.service';

export class ListNotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 30;

  @IsOptional()
  @IsIn(['true', 'false'])
  unread?: string;
}

/**
 * Generic in-app notifications for any authenticated account. Every query is
 * scoped to the caller's own user id, so no role restriction is required.
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser('id') userId: string, @Query() query: ListNotificationsQueryDto) {
    return this.notificationsService.list(userId, query.limit, query.unread === 'true');
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser('id') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.notificationsService.markRead(userId, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }
}

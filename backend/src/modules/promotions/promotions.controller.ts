import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PromoEventDto, PromoServeQueryDto } from './dto/promo-campaign.dto';
import { PromoMediaStorageService } from './promo-media-storage.service';
import { PromotionsService } from './promotions.service';

/** Public sponsored-campaign endpoints (no personal data is accepted or returned). */
@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly promotions: PromotionsService,
    private readonly mediaStorage: PromoMediaStorageService,
  ) {}

  @Public()
  @Get('serve')
  serve(@Query() query: PromoServeQueryDto) {
    return this.promotions.serve(query);
  }

  @Public()
  @Post('events')
  @HttpCode(200)
  track(@Body() dto: PromoEventDto, @Headers('user-agent') userAgent?: string) {
    return this.promotions.track(dto, userAgent ?? '');
  }

  /** Streams campaign videos with HTTP range support (required by iOS Safari). */
  @Public()
  @Get('media/:filename')
  async streamMedia(@Param('filename') filename: string, @Res() response: Response) {
    const { path, contentType } = await this.mediaStorage.pathFor(filename);
    response.sendFile(path, {
      acceptRanges: true,
      maxAge: '7d',
      immutable: true,
      headers: {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    });
  }
}

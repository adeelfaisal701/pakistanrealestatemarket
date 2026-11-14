import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { NewsLatestQueryDto, NewsListQueryDto } from './dto/news-query.dto';
import { MarketRatesService } from './market-rates.service';
import { NewsService } from './news.service';

/** Public, read-only daily market updates (no personal data). */
@Controller('daily-updates')
export class DailyUpdatesController {
  constructor(private readonly marketRates: MarketRatesService) {}

  @Public()
  @Get('ticker')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
  ticker() {
    return this.marketRates.getTicker();
  }
}

/** Public, read-only news built from publishers' RSS feeds. */
@Controller('news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Public()
  @Get()
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  list(@Query() query: NewsListQueryDto) {
    return this.news.list(query);
  }

  @Public()
  @Get('latest')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  latest(@Query() query: NewsLatestQueryDto) {
    return this.news.latest(query);
  }

  @Public()
  @Get('featured')
  @Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')
  featured() {
    return this.news.featured(3);
  }

  /** Publisher thumbnail, re-encoded and served same-origin (keeps the CSP strict). */
  @Public()
  @Get('thumbnails/:id')
  async thumbnail(@Param('id') id: string, @Res() response: Response) {
    const body = await this.news.thumbnail(id);
    response
      .status(200)
      .set({
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      })
      .send(body);
  }

  @Public()
  @Get(':slug')
  @Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=600')
  article(@Param('slug') slug: string) {
    return this.news.bySlug(slug);
  }
}

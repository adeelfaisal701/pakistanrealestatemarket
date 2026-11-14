import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminMutationRateLimitGuard } from '../admin/admin-mutation-rate-limit.guard';
import { PropertyImageStorageService } from '../properties/property-image-storage.service';
import { AdminPromotionsController } from './admin-promotions.controller';
import { PromoMediaStorageService } from './promo-media-storage.service';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { PromoCampaign, PromoCampaignSchema } from './schemas/promo-campaign.schema';
import { PromoDailyStat, PromoDailyStatSchema } from './schemas/promo-daily-stat.schema';
import { PromoEventDedup, PromoEventDedupSchema } from './schemas/promo-event-dedup.schema';
import { PromoSettings, PromoSettingsSchema } from './schemas/promo-settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PromoCampaign.name, schema: PromoCampaignSchema },
      { name: PromoDailyStat.name, schema: PromoDailyStatSchema },
      { name: PromoEventDedup.name, schema: PromoEventDedupSchema },
      { name: PromoSettings.name, schema: PromoSettingsSchema },
    ]),
  ],
  controllers: [AdminPromotionsController, PromotionsController],
  providers: [PromotionsService, PromoMediaStorageService, PropertyImageStorageService, AdminMutationRateLimitGuard],
})
export class PromotionsModule {}

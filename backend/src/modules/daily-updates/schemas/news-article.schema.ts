import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NewsCategory } from '../daily-updates.constants';

export type NewsArticleDocument = NewsArticle & Document;

/**
 * Headline, link, metadata and the publisher's own short feed description of
 * an article from an approved publisher's RSS feed. The article body is never stored.
 */
@Schema({ collection: 'news_articles', timestamps: true })
export class NewsArticle {
  /** SHA-256 of the canonical article URL (primary de-duplication key). */
  @Prop({ required: true })
  urlHash: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ required: true })
  title: string;

  /** Normalised headline used to suppress the same story syndicated twice. */
  @Prop({ required: true })
  titleKey: string;

  @Prop({ required: true })
  publisher: string;

  @Prop({ required: true })
  feedId: string;

  @Prop({ type: String, required: true, enum: Object.values(NewsCategory) })
  category: NewsCategory;

  @Prop({ required: true, type: Date })
  publishedAt: Date;

  /** At most two sentences from the publisher's own feed description. */
  @Prop({ default: '' })
  snippet: string;

  /** Publisher image URL (served to browsers only through the thumbnail proxy). */
  @Prop({ type: String, default: null })
  imageUrl: string | null;

  /** Whether the article page was already checked for an og:image. */
  @Prop({ default: false })
  imageLookupDone: boolean;

  @Prop({ required: true, type: Date })
  expiresAt: Date;
}

export const NewsArticleSchema = SchemaFactory.createForClass(NewsArticle);

NewsArticleSchema.index({ urlHash: 1 }, { unique: true });
NewsArticleSchema.index({ slug: 1 }, { unique: true });
NewsArticleSchema.index({ titleKey: 1, publishedAt: -1 });
NewsArticleSchema.index({ publishedAt: -1 });
NewsArticleSchema.index({ category: 1, publishedAt: -1 });
NewsArticleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

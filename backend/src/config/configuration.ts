import { createCorsPolicy } from './cors.config';

const MIN_JWT_SECRET_LENGTH = 32;

function getLocationShareTtlHours(): number {
  const value = process.env.PROPERTY_LOCATION_SHARE_TTL_HOURS;
  if (!value) return 24;

  const hours = Number(value);
  if (!Number.isInteger(hours) || hours < 1 || hours > 720) {
    throw new Error(
      'PROPERTY_LOCATION_SHARE_TTL_HOURS must be an integer between 1 and 720.',
    );
  }
  return hours;
}

function getPropertyLocationEncryptionKey(): string | undefined {
  const key = process.env.PROPERTY_LOCATION_ENCRYPTION_KEY?.trim();
  if (!key) return undefined;

  const decoded = Buffer.from(key, 'base64');
  if (decoded.length !== 32 || decoded.toString('base64') !== key) {
    throw new Error(
      'PROPERTY_LOCATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key.',
    );
  }
  return key;
}

/**
 * Reads JWT_SECRET and fails fast at startup if it is missing, too short or
 * still a placeholder. There is intentionally NO default value: a hard-coded
 * fallback would let anyone who can read the repo forge tokens.
 */
function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      'JWT_SECRET is not set. Add a strong random value to backend/.env (see .env.example).',
    );
  }
  if (secret.length < MIN_JWT_SECRET_LENGTH || secret.startsWith('CHANGE_ME')) {
    throw new Error(
      `JWT_SECRET must be a random string of at least ${MIN_JWT_SECRET_LENGTH} characters and must not be the placeholder value.`,
    );
  }
  return secret;
}

function requireMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (process.env.NODE_ENV === 'production') {
    if (!uri) {
      throw new Error('MONGODB_URI must be explicitly configured in production.');
    }
    let parsedUri: URL;
    try {
      parsedUri = new URL(uri);
    } catch {
      throw new Error('MONGODB_URI must be a valid production MongoDB URI.');
    }
    if (
      !['mongodb:', 'mongodb+srv:'].includes(parsedUri.protocol) ||
      isLocalHostname(parsedUri.hostname)
    ) {
      throw new Error('MONGODB_URI must not use a loopback host in production.');
    }
  }
  return uri || 'mongodb://127.0.0.1:27017/pak_real_estate';
}

function getFrontendBaseUrl(): string {
  const frontendBaseUrl = process.env.FRONTEND_BASE_URL?.trim();
  if (process.env.NODE_ENV === 'production') {
    if (!frontendBaseUrl) {
      throw new Error('FRONTEND_BASE_URL must be explicitly configured in production.');
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(frontendBaseUrl);
    } catch {
      throw new Error('FRONTEND_BASE_URL must be an HTTPS origin in production.');
    }
    if (
      parsedUrl.protocol !== 'https:' ||
      parsedUrl.username ||
      parsedUrl.password ||
      parsedUrl.pathname !== '/' ||
      parsedUrl.search ||
      parsedUrl.hash ||
      isLocalHostname(parsedUrl.hostname)
    ) {
      throw new Error('FRONTEND_BASE_URL must be an HTTPS origin without a loopback host in production.');
    }
  }
  return frontendBaseUrl || 'http://localhost:3000';
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized === '::1' ||
    normalized === '0.0.0.0' ||
    normalized.startsWith('127.')
  );
}

export default () => {
  const corsPolicy = createCorsPolicy(
    process.env.NODE_ENV,
    process.env.CORS_ORIGIN,
  );
  return {
    port: parseInt(process.env.PORT, 10) || 5000,
    nodeEnv: process.env.NODE_ENV,
    appName: process.env.APP_NAME || 'Pakistan Real Estate & Agent CRM API',
    database: {
      uri: requireMongoUri(),
    },
    jwt: {
      secret: requireJwtSecret(),
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    cors: {
      origin: corsPolicy.allowedOrigins.join(','),
    },
    propertyImages: {
      storageDir: process.env.PROPERTY_IMAGE_STORAGE_DIR,
      publicBaseUrl: process.env.PROPERTY_IMAGE_PUBLIC_BASE_URL,
    },
    admin: {
      email: process.env.ADMIN_EMAIL?.trim(),
    },
    propertyLocationShare: {
      ttlHours: getLocationShareTtlHours(),
      frontendBaseUrl: getFrontendBaseUrl(),
      encryptionKey: getPropertyLocationEncryptionKey(),
    },
    dailyUpdates: {
      // Scheduled rate/news fetching (and its DB writes) is OFF unless explicitly enabled.
      jobsEnabled: process.env.DAILY_UPDATES_JOBS_ENABLED?.trim().toLowerCase() === 'true',
      // RSS feed ids to collect (see NEWS_FEEDS). Empty by default: enable a publisher only after it has
      // granted permission for commercial display of its headlines, excerpts, thumbnails and links.
      newsFeeds: (process.env.NEWS_FEEDS_ENABLED ?? '').split(',').map((id) => id.trim()).filter(Boolean),
      // Public site URL or email sent in the User-Agent to data sources (required by MET Norway's terms).
      contact: process.env.DAILY_UPDATES_CONTACT?.trim() || undefined,
    },
  };
};

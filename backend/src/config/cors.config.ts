import type { RequestHandler } from 'express';

const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://admin.localhost:3000',
];

const DEVELOPMENT_PRIVATE_NETWORK_ORIGINS = new Set(DEVELOPMENT_ORIGINS);

export interface CorsPolicy {
  allowedOrigins: string[];
  credentials: false;
  methods: string[];
  allowedHeaders: string[];
  maxAge: number;
  origin: (
    origin: string | undefined,
    callback: (error: Error | null, allowed?: boolean) => void,
  ) => void;
}

export function createCorsPolicy(
  nodeEnv: string | undefined,
  configuredOrigins: string | undefined,
): CorsPolicy {
  if (!['development', 'test', 'production'].includes(nodeEnv ?? '')) {
    throw new Error('NODE_ENV must be explicitly set to development, test, or production.');
  }

  const configured = configuredOrigins
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
  let allowedOrigins: string[];

  if (nodeEnv === 'production') {
    if (configured.length === 0) {
      throw new Error('CORS_ORIGIN must explicitly list approved HTTPS frontend origins in production.');
    }
    allowedOrigins = configured.map((origin) => validateOrigin(origin, nodeEnv));
  } else if (nodeEnv === 'development') {
    allowedOrigins = (configured.length > 0 ? configured : DEVELOPMENT_ORIGINS)
      .map((origin) => validateOrigin(origin, nodeEnv));
  } else {
    allowedOrigins = configured.map((origin) => validateOrigin(origin, nodeEnv));
  }

  const uniqueOrigins = [...new Set(allowedOrigins)];
  return {
    allowedOrigins: uniqueOrigins,
    credentials: false,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Visitor-Session',
    ],
    maxAge: 600,
    origin: (origin, callback) => {
      callback(null, origin !== undefined && uniqueOrigins.includes(origin));
    },
  };
}

export function createPrivateNetworkCorsMiddleware(
  nodeEnv: string,
  allowedOrigins: string[],
): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (request, response, next) => {
    const origin = request.get('origin');
    const requestedPrivateNetwork = request.get('access-control-request-private-network');
    if (
      nodeEnv === 'development' &&
      request.method === 'OPTIONS' &&
      requestedPrivateNetwork?.toLowerCase() === 'true' &&
      origin &&
      allowed.has(origin) &&
      DEVELOPMENT_PRIVATE_NETWORK_ORIGINS.has(origin)
    ) {
      response.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
  };
}

function validateOrigin(origin: string, nodeEnv: string): string {
  if (origin === '*') {
    throw new Error('CORS_ORIGIN must not contain a wildcard origin.');
  }
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`CORS_ORIGIN contains an invalid origin: '${origin}'.`);
  }

  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.origin !== origin ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error(`CORS_ORIGIN entry '${origin}' must be an origin without path or credentials.`);
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLocalhost =
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]';
  if (nodeEnv === 'production' && (isLocalhost || parsed.protocol !== 'https:')) {
    throw new Error('Production CORS_ORIGIN entries must use HTTPS and must not use localhost.');
  }
  if (nodeEnv !== 'development' && parsed.protocol === 'http:') {
    throw new Error('Local HTTP CORS origins are allowed only in development.');
  }
  return parsed.origin;
}

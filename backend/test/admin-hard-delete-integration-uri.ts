const DATABASE_NAME = 'estatepro_hard_delete_integration_test';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export interface HardDeleteIntegrationUriOptions {
  atlasOptIn?: string;
  expectedAtlasHost?: string;
}

export function assertIsolatedHardDeleteIntegrationUri(
  uri: string,
  options: HardDeleteIntegrationUriOptions = {},
): void {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('Hard-delete integration URI is invalid.');
  }

  const queryOverridesDatabase = [...parsed.searchParams.keys()].some(
    (key) => key.toLowerCase() === 'dbname',
  );
  if (
    parsed.pathname !== `/${DATABASE_NAME}` ||
    queryOverridesDatabase ||
    parsed.hash
  ) {
    throw new Error(
      `Hard-delete integration URI must target only the dedicated ${DATABASE_NAME} database.`,
    );
  }

  if (
    parsed.protocol === 'mongodb:' &&
    LOOPBACK_HOSTS.has(parsed.hostname) &&
    parsed.searchParams.has('replicaSet') &&
    parsed.searchParams.get('replicaSet')?.trim()
  ) {
    return;
  }

  if (
    parsed.protocol !== 'mongodb+srv:' ||
    parsed.port !== '' ||
    options.atlasOptIn !== 'true' ||
    !options.expectedAtlasHost ||
    parsed.hostname !== options.expectedAtlasHost.toLowerCase() ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+mongodb\.net$/.test(
      parsed.hostname,
    ) ||
    parsed.searchParams.get('tls')?.toLowerCase() !== 'true'
  ) {
    throw new Error(
      `Hard-delete integration URI must target a local replica set or an explicitly opted-in, TLS-enabled Atlas host for ${DATABASE_NAME}.`,
    );
  }
}

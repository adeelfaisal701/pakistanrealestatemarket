import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

export interface ExactPropertyLocation {
  latitude: number;
  longitude: number;
  address: string;
}

function decodeLocationEncryptionKey(encodedKey: string): Buffer {
  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== 32 || key.toString('base64') !== encodedKey) {
    throw new Error('Invalid property location encryption configuration');
  }
  return key;
}

export function createLocationShareToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashLocationShareToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function encryptPrivateLocation(
  location: ExactPropertyLocation,
  encodedKey: string,
): string {
  const key = decodeLocationEncryptionKey(encodedKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(location), 'utf8'),
    cipher.final(),
  ]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptPrivateLocation(
  encryptedData: string,
  encodedKey: string,
): ExactPropertyLocation {
  const [version, encodedIv, encodedTag, encodedData, extra] =
    encryptedData.split('.');
  if (version !== 'v1' || !encodedIv || !encodedTag || !encodedData || extra) {
    throw new Error('Encrypted property location data is invalid');
  }

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      decodeLocationEncryptionKey(encodedKey),
      Buffer.from(encodedIv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encodedData, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
    const location = JSON.parse(plaintext) as ExactPropertyLocation;
    if (
      typeof location.latitude !== 'number' ||
      typeof location.longitude !== 'number' ||
      !Number.isFinite(location.latitude) ||
      !Number.isFinite(location.longitude) ||
      location.latitude < -90 ||
      location.latitude > 90 ||
      location.longitude < -180 ||
      location.longitude > 180 ||
      typeof location.address !== 'string'
    ) {
      throw new Error('Encrypted property location data is invalid');
    }
    return location;
  } catch {
    throw new Error('Encrypted property location data is invalid');
  }
}

export function toPublicProperty(property: any): Record<string, unknown> {
  const record =
    typeof property?.toObject === 'function' ? property.toObject() : property;
  const location = record.location ?? {};
  const populatedAgent =
    record.agentId &&
    typeof record.agentId === 'object' &&
    'name' in record.agentId
      ? {
          _id: record.agentId._id,
          name: record.agentId.name,
          phone: record.agentId.phone,
          agencyName: record.agentId.agencyName,
          avatarUrl: record.agentId.avatarUrl,
          isVerified: record.agentId.isVerified,
          city: record.agentId.city,
        }
      : record.agentId;

  return {
    _id: record._id,
    title: record.title,
    description: record.description,
    purpose: record.purpose,
    propertyType: record.propertyType,
    price: record.price,
    areaSize: record.areaSize,
    areaUnit: record.areaUnit,
    location: {
      city: location.city,
      area: location.area,
    },
    features: record.features,
    images: record.images ?? [],
    agentId: populatedAgent,
    status: record.status,
    availabilityStatus: record.inventoryStatus ?? 'available',
    isFeatured: record.isFeatured,
    viewsCount: record.viewsCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

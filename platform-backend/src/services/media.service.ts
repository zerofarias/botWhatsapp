import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const DEFAULT_MIMETYPE = 'application/octet-stream';
const DEFAULT_EXTENSION = '.bin';
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

export type MediaFile = {
  url: string;
  path: string;
  mimetype: string;
  size: number;
};

export type SaveMediaBufferOptions = {
  subdirectory?: string;
};

export type SaveBase64FileOptions = {
  base64: string;
  mimetype?: string | null;
  originalName?: string;
  subdirectory?: string;
};

const EXTENSION_MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mpg': 'video/mpeg',
  '.mpeg': 'video/mpeg',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.zip': 'application/zip',
  '.7z': 'application/x-7z-compressed',
};

const MIME_EXTENSION_MAP = new Map(
  Object.entries(EXTENSION_MIME_MAP).map(([ext, mime]) => [mime, ext])
);

function normalizeCategory(category?: string): string {
  if (!category) {
    return 'document';
  }
  const sanitized = category.toLowerCase().replace(/[^a-z0-9-_]/g, '');
  return sanitized || 'document';
}

function ensureLeadingDot(value: string): string {
  if (!value) {
    return '';
  }
  return value.startsWith('.')
    ? value.toLowerCase()
    : `.${value.toLowerCase()}`;
}

function lookupExtensionFromMimetype(mimetype: string): string {
  const normalized = mimetype.toLowerCase();
  return MIME_EXTENSION_MAP.get(normalized) ?? DEFAULT_EXTENSION;
}

function resolveExtension(
  originalName: string | undefined,
  mimetype: string
): string {
  const fromName = ensureLeadingDot(path.extname(originalName ?? ''));
  if (fromName) {
    return fromName;
  }
  return lookupExtensionFromMimetype(mimetype) || DEFAULT_EXTENSION;
}

function extractBase64Payload(value: string): string {
  const trimmed = value.trim();
  const commaIndex = trimmed.indexOf(',');
  if (commaIndex === -1) {
    return trimmed;
  }
  const possibleHeader = trimmed.slice(0, commaIndex).toLowerCase();
  if (!possibleHeader.includes('base64')) {
    return trimmed;
  }
  return trimmed.slice(commaIndex + 1);
}

function sanitizeOriginalName(name: string | undefined): string | undefined {
  if (!name) {
    return undefined;
  }
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function resolveMimetype(
  mimetype: string | null | undefined,
  originalName?: string
): string {
  if (mimetype && mimetype.trim()) {
    return mimetype.trim();
  }
  const extension = ensureLeadingDot(path.extname(originalName ?? ''));
  if (extension) {
    return getMimetypeFromExtension(extension);
  }
  return DEFAULT_MIMETYPE;
}

export function getMediaTypeFromMimetype(mimetype: string): string {
  const type = mimetype.split('/')[0];
  if (['image', 'video', 'audio'].includes(type)) {
    return type;
  }
  return 'document';
}

export function getMimetypeFromExtension(extension: string): string {
  if (!extension) {
    return DEFAULT_MIMETYPE;
  }
  const normalized = ensureLeadingDot(extension);
  return EXTENSION_MIME_MAP[normalized] ?? DEFAULT_MIMETYPE;
}

export async function saveMediaBuffer(
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  options: SaveMediaBufferOptions = {}
): Promise<MediaFile> {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Expected buffer with media contents');
  }

  const normalizedName = sanitizeOriginalName(originalName) ?? 'media';
  const resolvedMimetype = resolveMimetype(mimetype, normalizedName);
  const extension = resolveExtension(normalizedName, resolvedMimetype);

  const category = normalizeCategory(
    options.subdirectory ?? getMediaTypeFromMimetype(resolvedMimetype)
  );
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const directory = path.join(UPLOADS_ROOT, category, `${year}-${month}`);

  await fs.mkdir(directory, { recursive: true });

  const safeFilename = `${crypto.randomBytes(16).toString('hex')}${extension}`;
  const filePath = path.join(directory, safeFilename);
  await fs.writeFile(filePath, buffer);

  const publicUrl = `/uploads/${category}/${year}-${month}/${safeFilename}`;
  return {
    url: publicUrl.replace(/\\/g, '/'),
    path: filePath,
    mimetype: resolvedMimetype,
    size: buffer.length,
  };
}

export async function saveBase64File(
  options: SaveBase64FileOptions
): Promise<MediaFile> {
  const { base64, mimetype, originalName, subdirectory } = options;

  if (!base64 || typeof base64 !== 'string') {
    throw new TypeError('Base64 content is required');
  }

  const payload = extractBase64Payload(base64);
  let buffer: Buffer;
  try {
    buffer = Buffer.from(payload, 'base64');
  } catch (error) {
    throw new Error('Invalid base64 payload');
  }

  if (!buffer.length) {
    throw new Error('Decoded base64 payload is empty');
  }

  const sanitizedName = sanitizeOriginalName(originalName);
  const resolvedMimetype = resolveMimetype(mimetype, sanitizedName);
  const fallbackName =
    sanitizedName ??
    `media-${Date.now()}${lookupExtensionFromMimetype(resolvedMimetype)}`;

  return saveMediaBuffer(buffer, fallbackName, resolvedMimetype, {
    subdirectory,
  });
}

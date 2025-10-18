import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

export interface MediaFile {
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  path: string;
}

export function getMediaTypeFromMimetype(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('application/pdf') || mimetype.includes('document'))
    return 'document';
  return 'document';
}

export function generateFilename(
  originalName: string,
  mimetype: string
): string {
  const ext = path.extname(originalName) || getExtensionFromMimetype(mimetype);
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
}

function getExtensionFromMimetype(mimetype: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'audio/mpeg': '.mp3',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'audio/mp4': '.m4a',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      '.docx',
    'text/plain': '.txt',
  };
  return extensions[mimetype] || '.bin';
}

export async function ensureUploadsDirectory(): Promise<void> {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }

  // Crear subdirectorios por año-mes
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}`;
  const monthDir = path.join(UPLOADS_DIR, yearMonth);

  try {
    await fs.access(monthDir);
  } catch {
    await fs.mkdir(monthDir, { recursive: true });
  }
}

export async function saveMediaBuffer(
  buffer: Buffer,
  originalName: string,
  mimetype: string
): Promise<MediaFile> {
  await ensureUploadsDirectory();

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}`;
  const filename = generateFilename(originalName, mimetype);
  const relativePath = path.join(yearMonth, filename);
  const fullPath = path.join(UPLOADS_DIR, relativePath);

  await fs.writeFile(fullPath, buffer);

  return {
    originalName,
    filename,
    mimetype,
    size: buffer.length,
    url: `/uploads/${relativePath.replace(/\\/g, '/')}`,
    path: fullPath,
  };
}

export async function deleteMediaFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.warn('[Media] Failed to delete file:', filePath, error);
  }
}

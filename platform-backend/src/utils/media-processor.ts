import {
  saveBase64File,
  getMediaTypeFromMimetype,
  getMimetypeFromExtension,
} from '../services/media.service.js';

export function isBase64String(value: string): boolean {
  if (!value || value.length < 80) return false;
  const sanitized = value.replace(/\s+/g, '');
  const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
  return sanitized.length > 80 && base64Pattern.test(sanitized.slice(0, 160));
}

function getFileExtensionFromBase64(base64: string): string {
  try {
    const sample = base64.slice(0, 120);
    const buffer = Buffer.from(sample, 'base64');
    const magic = buffer.toString('hex').toUpperCase();

    if (magic.startsWith('FFD8FF')) return '.jpg';
    if (magic.startsWith('89504E47')) return '.png';
    if (magic.startsWith('47494638')) return '.gif';
    if (magic.startsWith('52494646')) return '.webp';
    if (magic.startsWith('00000018') && magic.includes('667479706D703432'))
      return '.mp4';
    if (magic.startsWith('0000001C667479704D3441')) return '.m4a';
    if (
      magic.startsWith('494433') ||
      magic.startsWith('FFF3') ||
      magic.startsWith('FFFB')
    )
      return '.mp3';
    if (magic.startsWith('4F676753')) return '.ogg';
    if (magic.startsWith('25504446')) return '.pdf';
  } catch (error) {
    console.warn('[Media] Unable to detect extension from base64:', error);
  }
  return '.bin';
}

function getMediaTypeFromExtension(extension: string): string {
  const lower = extension.toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(lower))
    return 'image';
  if (['.mp4', '.webm', '.mov', '.mpg'].includes(lower)) return 'video';
  if (['.mp3', '.ogg', '.wav', '.m4a'].includes(lower)) return 'audio';
  if (['.pdf', '.doc', '.docx', '.txt'].includes(lower)) return 'document';
  return 'document';
}

export async function processBase64Content(
  content: string
): Promise<{ mediaUrl: string; mediaType: string } | null> {
  if (!isBase64String(content)) {
    return null;
  }

  try {
    const extension = getFileExtensionFromBase64(content);
    const mediaType = getMediaTypeFromExtension(extension);
    const mimetype = getMimetypeFromExtension(extension);

    const mediaFile = await saveBase64File({
      base64: content,
      mimetype,
      originalName: `media-${Date.now()}${extension}`,
      subdirectory: mediaType,
    });

    return {
      mediaUrl: mediaFile.url,
      mediaType: getMediaTypeFromMimetype(mediaFile.mimetype),
    };
  } catch (error) {
    console.error('[Media] Error processing base64 content:', error);
    return null;
  }
}

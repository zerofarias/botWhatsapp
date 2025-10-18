import fs from 'fs/promises';
import path from 'path';

// Función para detectar si una cadena es base64
export function isBase64String(str: string): boolean {
  if (!str || str.length < 100) return false;

  // Patrón básico de base64
  const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;

  // Verificar si parece base64 de imagen
  return str.length > 1000 && base64Pattern.test(str.substring(0, 100));
}

// Función para obtener la extensión basada en los primeros bytes del base64
export function getFileExtensionFromBase64(base64: string): string {
  const header = base64.substring(0, 50);

  // Convertir a buffer para leer los magic bytes
  try {
    const buffer = Buffer.from(base64.substring(0, 100), 'base64');
    const magic = buffer.toString('hex').toUpperCase();

    // Magic bytes comunes
    if (magic.startsWith('FFD8FF')) return '.jpg';
    if (magic.startsWith('89504E47')) return '.png';
    if (magic.startsWith('47494638')) return '.gif';
    if (magic.startsWith('52494646')) return '.webp';
    if (
      magic.startsWith('00000018667479706D703432') ||
      magic.startsWith('00000020667479706D703432')
    )
      return '.mp4';
    if (
      magic.startsWith('494433') ||
      magic.startsWith('FFF3') ||
      magic.startsWith('FFFB')
    )
      return '.mp3';
    if (magic.startsWith('4F676753')) return '.ogg';
    if (magic.startsWith('25504446')) return '.pdf';
  } catch (error) {
    console.warn('Error detecting file type:', error);
  }

  return '.bin';
}

// Función para obtener el tipo de media basado en la extensión
export function getMediaTypeFromExtension(extension: string): string {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const videoExts = ['.mp4', '.avi', '.mov', '.webm'];
  const audioExts = ['.mp3', '.ogg', '.wav', '.m4a'];
  const docExts = ['.pdf', '.doc', '.docx', '.txt'];

  if (imageExts.includes(extension.toLowerCase())) return 'image';
  if (videoExts.includes(extension.toLowerCase())) return 'video';
  if (audioExts.includes(extension.toLowerCase())) return 'audio';
  if (docExts.includes(extension.toLowerCase())) return 'document';

  return 'document';
}

// Función para procesar base64 y guardarlo como archivo
export async function processBase64Content(
  content: string
): Promise<{ mediaUrl: string; mediaType: string } | null> {
  if (!isBase64String(content)) {
    return null;
  }

  try {
    // Crear directorio de uploads si no existe
    const uploadsDir = path.join(process.cwd(), 'uploads');

    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    // Crear subdirectorio por fecha
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;
    const monthDir = path.join(uploadsDir, yearMonth);

    try {
      await fs.access(monthDir);
    } catch {
      await fs.mkdir(monthDir, { recursive: true });
    }

    // Detectar tipo de archivo
    const extension = getFileExtensionFromBase64(content);
    const mediaType = getMediaTypeFromExtension(extension);

    // Generar nombre único
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const filename = `media-${timestamp}-${randomSuffix}${extension}`;

    // Guardar archivo
    const filePath = path.join(monthDir, filename);
    const buffer = Buffer.from(content, 'base64');
    await fs.writeFile(filePath, buffer);

    const mediaUrl = `/uploads/${yearMonth}/${filename}`;

    console.log(`[Media] Saved base64 content as ${mediaType}: ${mediaUrl}`);

    return { mediaUrl, mediaType };
  } catch (error) {
    console.error('[Media] Error processing base64 content:', error);
    return null;
  }
}

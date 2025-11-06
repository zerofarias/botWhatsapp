/**
 * Utilidades para manejo de URLs de API y multimedia
 */

/**
 * Obtiene la URL base del API desde la variable de entorno o el proxy
 */
export function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && apiUrl.length) {
    // Si VITE_API_URL es http://example.com:4001/api, extraer http://example.com:4001
    return apiUrl.replace(/\/api\/?$/, '');
  }
  // En desarrollo, usar el mismo host/puerto (el proxy se encarga)
  return window.location.origin;
}

/**
 * Construye la URL completa de una foto de contacto
 * @param photoUrl URL relativa o absoluta de la foto
 * @returns URL completa de la foto
 */
export function getPhotoUrl(photoUrl?: string | null): string {
  if (!photoUrl) return '';

  // Si es una URL absoluta, devolverla tal cual
  if (photoUrl.startsWith('http')) {
    return photoUrl;
  }

  // Si ya tiene /uploads/, usar la base del API
  if (photoUrl.startsWith('/uploads/')) {
    const apiBase = getApiBaseUrl();
    return `${apiBase}${photoUrl}`;
  }

  // Si no, construir la ruta completa
  const apiBase = getApiBaseUrl();
  return `${apiBase}/uploads/${photoUrl}`;
}

/**
 * Construye la URL completa de multimedia (imagen, video, documento, etc)
 * @param url URL relativa o absoluta del media
 * @returns URL completa del media
 */
export function getFullMediaUrl(url?: string | null): string {
  if (!url) return '';

  // Si es una URL absoluta, devolverla tal cual
  if (url.startsWith('http')) {
    return url;
  }

  // Si ya tiene /uploads/, usar la base del API
  if (url.startsWith('/uploads/')) {
    const apiBase = getApiBaseUrl();
    return `${apiBase}${url}`;
  }

  // Si no, construir la ruta completa
  const apiBase = getApiBaseUrl();
  return `${apiBase}/uploads/${url}`;
}

/**
 * Obtiene solo el nombre de archivo de una ruta
 * @param path Ruta del archivo
 * @returns Nombre del archivo
 */
export function getFileName(path?: string | null): string {
  if (!path) return '';
  const parts = path.split('/');
  return parts[parts.length - 1] || '';
}

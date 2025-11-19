import type { Order } from '../hooks/v2/useOrders';

export type OrderMetaPayload = Record<string, unknown> & {
  __orderNode?: Record<string, unknown>;
};

const orderMetaCache = new WeakMap<Order, OrderMetaPayload | null>();

export const getOrderMeta = (order: Order): OrderMetaPayload | null => {
  if (orderMetaCache.has(order)) {
    return orderMetaCache.get(order) ?? null;
  }

  let parsed: OrderMetaPayload | null = null;
  try {
    const raw = JSON.parse(order.itemsJson ?? '{}');
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      parsed = raw as OrderMetaPayload;
    }
  } catch {
    parsed = null;
  }

  orderMetaCache.set(order, parsed);
  return parsed;
};

export const extractOrderField = (
  order: Order,
  field: 'concept' | 'requestDetails' | 'customerData' | 'paymentMethod'
): string => {
  const directValue = (order as unknown as Record<string, unknown>)[field];
  if (typeof directValue === 'string' && directValue.trim().length) {
    return directValue.trim();
  }

  const meta = getOrderMeta(order);
  if (meta) {
    const fromRoot = meta[field];
    if (typeof fromRoot === 'string' && fromRoot.trim().length) {
      return fromRoot.trim();
    }
    const nested = meta.__orderNode;
    if (
      nested &&
      typeof nested === 'object' &&
      typeof (nested as Record<string, unknown>)[field] === 'string'
    ) {
      const nestedValue = String(
        (nested as Record<string, unknown>)[field]
      ).trim();
      if (nestedValue.length) {
        return nestedValue;
      }
    }
  }

  return '';
};

export type OrderAttachmentMeta = {
  url: string;
  type?: string | null;
  caption?: string | null;
  fileName?: string | null;
  mimetype?: string | null;
  variable?: string | null;
  capturedAt?: string | null;
  text?: string | null;
};

export const getOrderAttachments = (order: Order): OrderAttachmentMeta[] => {
  const meta = getOrderMeta(order);
  if (!meta) {
    return [];
  }

  const nodeMeta = meta.__orderNode;
  if (!nodeMeta || typeof nodeMeta !== 'object') {
    return [];
  }

  const rawAttachments = (nodeMeta as Record<string, unknown>)['attachments'];
  if (!Array.isArray(rawAttachments)) {
    return [];
  }

  const attachments: OrderAttachmentMeta[] = [];
  rawAttachments.forEach((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return;
    }
    const payload = raw as Record<string, unknown>;
    const url = payload.url;
    if (typeof url !== 'string' || !url.trim().length) {
      return;
    }
    attachments.push({
      url,
      type:
        typeof payload.type === 'string' ? (payload.type as string) : null,
      caption:
        typeof payload.caption === 'string'
          ? (payload.caption as string)
          : null,
      fileName:
        typeof payload.fileName === 'string'
          ? (payload.fileName as string)
          : typeof payload.filename === 'string'
          ? (payload.filename as string)
          : null,
      mimetype:
        typeof payload.mimetype === 'string'
          ? (payload.mimetype as string)
          : null,
      variable:
        typeof payload.variable === 'string'
          ? (payload.variable as string)
          : null,
      capturedAt:
        typeof payload.capturedAt === 'string'
          ? (payload.capturedAt as string)
          : null,
      text:
        typeof payload.text === 'string' ? (payload.text as string) : null,
    });
  });

  return attachments;
};

export type OrderAttachmentKind =
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'location'
  | 'file';

const normalizeAttachmentReference = (attachment: OrderAttachmentMeta) =>
  `${attachment.type ?? ''} ${attachment.mimetype ?? ''} ${
    attachment.fileName ?? ''
  }`.toLowerCase();

export const resolveAttachmentKind = (
  attachment: OrderAttachmentMeta
): OrderAttachmentKind => {
  const ref = normalizeAttachmentReference(attachment);
  const url = attachment.url.toLowerCase();
  if (ref.includes('image') || url.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
    return 'image';
  }
  if (ref.includes('audio') || ref.includes('voice') || ref.includes('ptt')) {
    return 'audio';
  }
  if (ref.includes('video') || url.match(/\.(mp4|mov|mkv)$/)) {
    return 'video';
  }
  if (ref.includes('location')) {
    return 'location';
  }
  if (
    ref.includes('pdf') ||
    ref.includes('document') ||
    url.endsWith('.pdf') ||
    url.endsWith('.doc') ||
    url.endsWith('.docx') ||
    url.endsWith('.xls') ||
    url.endsWith('.xlsx')
  ) {
    return 'document';
  }
  return 'file';
};

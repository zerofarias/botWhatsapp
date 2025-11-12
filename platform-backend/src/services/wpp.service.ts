// Exportar función para obtener snapshot de conversación
export async function fetchConversationSnapshot(
  conversationId: bigint | number
): Promise<ConversationSnapshot | null> {
  const record = await prisma.conversation.findUnique({
    where: { id: BigInt(conversationId) },
    select: {
      id: true,
      userPhone: true,
      contactName: true,
      contactId: true,
      areaId: true,
      assignedToId: true,
      status: true,
      progressStatus: true,
      botActive: true,
      lastActivity: true,
      updatedAt: true,
      contact: {
        select: {
          id: true,
          name: true,
          phone: true,
          dni: true,
          address1: true,
          address2: true,
        },
      },
    },
  });
  if (!record) return null;
  return {
    id: record.id.toString(),
    userPhone: record.userPhone,
    contactName: record.contactName,
    contactId: record.contactId ?? null,
    contact: record.contact
      ? {
          id: record.contact.id,
          name: record.contact.name,
          phone: record.contact.phone,
          dni: record.contact.dni,
          address1: record.contact.address1 ?? null,
          address2: record.contact.address2 ?? null,
        }
      : null,
    areaId: record.areaId,
    assignedToId: record.assignedToId,
    status: record.status,
    progressStatus: record.progressStatus,
    botActive: record.botActive,
    lastActivity: record.lastActivity.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

// Nueva función para obtener la CONVERSACIÓN COMPLETA con TODOS los datos
// (para usar en eventos de socket que necesitan datos completos)
export async function fetchConversationSnapshot_Full(
  conversationId: bigint | number
): Promise<any> {
  const { conversationSelect } = await import('./conversation.service.js');

  const record = await prisma.conversation.findUnique({
    where: { id: BigInt(conversationId) },
    select: conversationSelect,
  });

  if (!record) return null;

  // Transformar a formato que espera el frontend
  return {
    ...record,
    id: record.id.toString(),
    contact: record.contact
      ? { ...record.contact, id: record.contact.id.toString() }
      : null,
    area: record.area,
    assignedTo: record.assignedTo,
    lastMessage:
      record.messages && record.messages.length > 0
        ? {
            ...record.messages[0],
            id: record.messages[0].id.toString(),
            conversationId: record.messages[0].conversationId.toString(),
          }
        : null,
  };
}

// Exportar función para obtener rooms de conversación
export function conversationRooms(snapshot: ConversationSnapshot) {
  const rooms = new Set<string>();
  if (snapshot.assignedToId) {
    rooms.add(`user:${snapshot.assignedToId}`);
  }
  if (snapshot.areaId) {
    rooms.add(`area:${snapshot.areaId}`);
  }
  rooms.add('role:ADMIN');
  rooms.add('role:SUPERVISOR');
  return rooms;
}

// Exportar función para emitir eventos a un room
export function emitToRoom(
  io: SocketIOServer | undefined,
  room: string,
  event: string,
  payload: unknown
) {
  if (!io) return;
  io.to(room).emit(event, payload);
}
import {
  create as createClient,
  type CreateOptions,
  type Message,
  type Whatsapp,
} from '@wppconnect-team/wppconnect';
import { BotSessionStatus, MessageSender, Prisma } from '@prisma/client';
import type { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import dayjs from 'dayjs';
import {
  addConversationEvent,
  assignConversationToArea,
  createConversation,
  findOpenConversationByPhone,
  isActiveConversationStatus,
  touchConversation,
  addConversationNote,
} from './conversation.service.js';
import {
  createConversationMessage,
  findMessageByExternalId,
  type ConversationMessage,
} from './message.service.js';
import { findOrCreateContactByPhone } from './contact.service.js';
import { listFlowTree, type FlowNode } from './flow.service.js';
import {
  executeNodeChain,
  enrichContextWithGlobalVariables,
  interpolateVariables,
} from './node-execution.service.js';
import { beginTrackedTask } from '../utils/shutdown-manager.js';

/**
 * Convierte BigInt a Number en un objeto para evitar errores de serialización JSON
 */
function sanitizeBigInts(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeBigInts);
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeBigInts(value);
    }
    return result;
  }
  return obj;
}

import {
  checkIfWithinWorkingHours,
  formatAfterHoursMessage,
} from '../utils/working-hours.js';
import { logSystem } from '../utils/log-system.js';
import { isBase64String } from '../utils/media-processor.js';
import {
  saveMediaBuffer,
  saveBase64File,
  getMediaTypeFromMimetype,
  type MediaFile,
} from './media.service.js';

type SessionCache = {
  client: Whatsapp;
  status: BotSessionStatus;
  lastQr: string | null;
  lastQrAscii: string | null;
  connectedAt: Date | null;
  paused: boolean;
};

// Cache para evitar procesamiento duplicado de mensajes
type MessageCache = {
  timestamp: number;
  processed: boolean;
};

const messageProcessingCache = new Map<string, MessageCache>();
const MESSAGE_CACHE_TTL = 60000; // 1 minuto en cache

// Función para limpiar cache expirado
function cleanExpiredMessageCache() {
  const now = Date.now();
  for (const [key, value] of messageProcessingCache.entries()) {
    if (now - value.timestamp > MESSAGE_CACHE_TTL) {
      messageProcessingCache.delete(key);
    }
  }
}

// Función para verificar si un mensaje ya está siendo procesado
function isMessageBeingProcessed(messageId: string): boolean {
  cleanExpiredMessageCache();
  return messageProcessingCache.has(messageId);
}

// Función para marcar mensaje como procesándose
function markMessageAsProcessing(messageId: string) {
  messageProcessingCache.set(messageId, {
    timestamp: Date.now(),
    processed: false,
  });
}

// Función para marcar mensaje como completado
function markMessageAsCompleted(messageId: string) {
  const entry = messageProcessingCache.get(messageId);
  if (entry) {
    entry.processed = true;
  }
}

type ConversationSnapshot = {
  id: string;
  userPhone: string;
  contactName: string | null;
  contactId: number | null;
  contact: {
    id: number;
    name: string;
    phone: string;
    dni: string | null;
    address1: string | null;
    address2: string | null;
  } | null;
  areaId: number | null;
  assignedToId: number | null;
  status: string;
  progressStatus: string;
  botActive: boolean;
  lastActivity: string;
  updatedAt: string;
};

type MessageEventPayload = {
  id: string;
  conversationId: string;
  senderType: MessageSender;
  senderId: number | null;
  senderName: string | null;
  senderUsername: string | null;
  content: string;
  mediaType: string | null;
  mediaUrl: string | null;
  createdAt: string;
};

type BuilderOptionConfig = {
  id: string;
  label: string;
  trigger: string;
  targetId: string | null;
};

type BuilderConfig = {
  messageType: 'TEXT' | 'BUTTONS' | 'LIST';
  options: BuilderOptionConfig[];
  buttonTitle?: string;
  buttonFooter?: string;
  listButtonText?: string;
  listTitle?: string;
  listDescription?: string;
};

type FlowExecutionResult = {
  reply: string;
  redirectAreaId?: number | null;
  pauseBot?: boolean;
  matchedNode: FlowNode;
};

const sessions = new Map<number, SessionCache>();
const AFTER_HOURS_MESSAGE =
  '🕓 Nuestro horario de atención es de 8:00 a 18:00 hs. Te responderemos apenas volvamos a estar disponibles.';

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function extractNumericPrefix(value: string) {
  const match = value.match(/^\d+/);
  return match ? match[0] : null;
}

function getExtensionForType(messageType: string): string {
  const extensions: Record<string, string> = {
    image: '.jpg',
    video: '.mp4',
    audio: '.mp3',
    ptt: '.ogg',
    document: '.pdf',
    sticker: '.webp',
  };
  return extensions[messageType] || '.bin';
}

function getMediaTypeForMessage(messageType: string): string {
  const types: Record<string, string> = {
    image: 'image',
    video: 'video',
    audio: 'audio',
    ptt: 'audio',
    document: 'document',
    sticker: 'image',
  };
  return types[messageType] || 'document';
}

function normalizeMediaCategory(messageType: unknown): string {
  if (typeof messageType !== 'string') {
    return 'document';
  }
  const normalized = messageType.toLowerCase();
  if (normalized === 'ptt' || normalized === 'voice') return 'audio';
  if (normalized === 'sticker') return 'image';
  if (
    ['image', 'video', 'audio', 'document', 'location'].includes(normalized)
  ) {
    return normalized;
  }
  return 'document';
}

function buildMediaDescription(
  messageType: unknown,
  filename?: string | null,
  caption?: string | null
): string {
  if (caption && caption.trim()) {
    return caption.trim();
  }

  const type = normalizeMediaCategory(messageType);
  const labels: Record<string, string> = {
    image: 'Imagen recibida',
    video: 'Video recibido',
    audio: 'Audio recibido',
    document: 'Documento recibido',
    location: 'Ubicacion recibida',
  };
  const base = labels[type] ?? 'Archivo recibido';

  if (filename && filename.trim()) {
    return `${base}: ${filename.trim()}`;
  }

  return base;
}

function buildLocationDescription(lat: number, lng: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'Ubicacion recibida';
  }
  return `Ubicacion: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function resolveMapsUrl(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

async function persistBase64Media(
  base64: string,
  messageType: unknown,
  options: { mimetype?: string | null; filename?: string | null } = {}
): Promise<{ url: string; mediaType: string; mimetype: string } | null> {
  if (!base64 || base64.length < 40) {
    return null;
  }

  try {
    const category = normalizeMediaCategory(messageType);
    const stored = await saveBase64File({
      base64,
      mimetype: options.mimetype ?? undefined,
      originalName: options.filename ?? undefined,
      subdirectory: category,
    });

    return {
      url: stored.url,
      mediaType: getMediaTypeFromMimetype(stored.mimetype),
      mimetype: stored.mimetype,
    };
  } catch (error) {
    console.error('[WPP] Failed to persist base64 media:', error);
    return null;
  }
}

async function handleMediaMessage(
  client: Whatsapp,
  message: Message
): Promise<{ mediaUrl: string; mediaType: string } | null> {
  try {
    // Detectar el tipo de mensaje multimedia
    const messageType = (message as any).type;
    const mimetype = (message as any).mimetype || '';

    if (
      !['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(
        messageType
      )
    ) {
      return null;
    }

    // Descargar el contenido multimedia
    const base64Data = await client.downloadMedia(message);
    if (!base64Data) {
      return null;
    }

    // Convertir base64 a buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Generar nombre original basado en el tipo
    const originalName = `media-${Date.now()}${getExtensionFromMessageType(
      messageType,
      mimetype
    )}`;

    // Guardar el archivo
    const mediaFile = await saveMediaBuffer(
      buffer,
      originalName,
      mimetype || getDefaultMimetype(messageType)
    );

    return {
      mediaUrl: mediaFile.url,
      mediaType: getMediaTypeFromMimetype(mediaFile.mimetype),
    };
  } catch (error) {
    console.error('[WPP] Error handling media message:', error);
    return null;
  }
}

function getExtensionFromMessageType(
  messageType: string,
  mimetype: string
): string {
  if (mimetype) {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'audio/mpeg': '.mp3',
      'audio/ogg': '.ogg',
      'audio/wav': '.wav',
      'application/pdf': '.pdf',
    };
    return extensions[mimetype] || '.bin';
  }

  const typeExtensions: Record<string, string> = {
    image: '.jpg',
    video: '.mp4',
    audio: '.mp3',
    ptt: '.ogg',
    document: '.pdf',
    sticker: '.webp',
  };
  return typeExtensions[messageType] || '.bin';
}

function getDefaultMimetype(messageType: string): string {
  const defaultMimetypes: Record<string, string> = {
    image: 'image/jpeg',
    video: 'video/mp4',
    audio: 'audio/mpeg',
    ptt: 'audio/ogg',
    document: 'application/pdf',
    sticker: 'image/webp',
  };
  return defaultMimetypes[messageType] || 'application/octet-stream';
}

async function handleLocationMessage(message: Message): Promise<{
  mediaType: string;
  latitude?: number;
  longitude?: number;
} | null> {
  const messageData = message as any;
  if (messageData.type === 'location' && messageData.lat && messageData.lng) {
    return {
      mediaType: 'location',
      latitude: parseFloat(messageData.lat),
      longitude: parseFloat(messageData.lng),
    };
  }
  return null;
}

function matchesSingleTrigger(trigger: string, normalizedBody: string) {
  if (!trigger && !normalizedBody) {
    return true;
  }

  if (trigger === normalizedBody) {
    return true;
  }

  const triggerNumber = extractNumericPrefix(trigger);
  if (triggerNumber && normalizedBody === triggerNumber) {
    return true;
  }

  const bodyNumber = extractNumericPrefix(normalizedBody);
  if (triggerNumber && bodyNumber && triggerNumber === bodyNumber) {
    return true;
  }

  return false;
}

function matchesTrigger(trigger: string, normalizedBody: string) {
  const normalizedTrigger = normalizeText(trigger);
  if (!normalizedTrigger) {
    return !normalizedBody;
  }

  const parts = normalizedTrigger
    .split(/[,;|]/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (!parts.length) {
    return !normalizedBody;
  }

  return parts.some((part) => matchesSingleTrigger(part, normalizedBody));
}

function flattenFlowTree(nodes: FlowNode[]): FlowNode[] {
  const stack = [...nodes];
  const flat: FlowNode[] = [];

  while (stack.length) {
    const node = stack.shift()!;
    flat.push(node);
    if (node.children?.length) {
      stack.unshift(...node.children);
    }
  }

  return flat;
}

function findPrimaryMenuNode(nodes: FlowNode[]): FlowNode | null {
  if (!nodes.length) {
    return null;
  }
  const menu = nodes.find((node) => node.type === 'MENU');
  return menu ?? nodes[0] ?? null;
}

function buildPrimaryMenuMessage(nodes: FlowNode[]): string | null {
  const root = findPrimaryMenuNode(nodes);
  return root?.message ?? null;
}

function sanitizeBuilderString(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    value = String(value);
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function parseBuilderConfig(node: FlowNode): BuilderConfig {
  const config: BuilderConfig = {
    messageType: 'TEXT',
    options: [],
  };

  const metadata = node.metadata as Prisma.JsonValue | null;
  if (!metadata || typeof metadata !== 'object') {
    return config;
  }

  const root = metadata as Record<string, unknown>;
  const builderValue =
    'builder' in root ? (root as Record<string, unknown>).builder : undefined;
  const builder =
    builderValue && typeof builderValue === 'object'
      ? (builderValue as Record<string, unknown>)
      : null;

  if (!builder) {
    return config;
  }

  const messageTypeRaw = sanitizeBuilderString(
    builder.messageType
  )?.toUpperCase();
  if (messageTypeRaw === 'BUTTONS' || messageTypeRaw === 'LIST') {
    config.messageType = messageTypeRaw;
  }

  const optionsRaw = Array.isArray(builder.options)
    ? (builder.options as unknown[])
    : [];

  optionsRaw.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const option = entry as Record<string, unknown>;
    const rawId = sanitizeBuilderString(option.id);
    const id =
      rawId && rawId.length
        ? rawId
        : `opt-${Math.random().toString(36).slice(2, 10)}`;
    const label = sanitizeBuilderString(option.label) ?? '';

    const buildSlug = (value: string | null): string => {
      if (!value) return '';
      const normalized = normalizeText(value).replace(/[^a-z0-9]+/g, '_');
      const trimmed = normalized.replace(/^_+|_+$/g, '');
      if (trimmed.length) {
        return trimmed;
      }
      return value.replace(/\s+/g, '_');
    };

    let trigger = sanitizeBuilderString(option.trigger);
    if (trigger) {
      const slug = buildSlug(trigger);
      trigger = slug.length ? slug : trigger;
    } else if (label) {
      const slug = buildSlug(label);
      trigger = slug.length ? slug : label;
    } else {
      trigger = id;
    }

    const targetId = sanitizeBuilderString(option.targetId) ?? null;

    config.options.push({
      id,
      label: label || trigger,
      trigger,
      targetId,
    });
  });

  const buttonTitle = sanitizeBuilderString(builder.buttonTitle);
  if (buttonTitle) {
    config.buttonTitle = buttonTitle;
  }
  const buttonFooter = sanitizeBuilderString(builder.buttonFooter);
  if (buttonFooter) {
    config.buttonFooter = buttonFooter;
  }

  const listButtonText = sanitizeBuilderString(builder.listButtonText);
  if (listButtonText) {
    config.listButtonText = listButtonText;
  }
  const listTitle = sanitizeBuilderString(builder.listTitle);
  if (listTitle) {
    config.listTitle = listTitle;
  }
  const listDescription = sanitizeBuilderString(builder.listDescription);
  if (listDescription) {
    config.listDescription = listDescription;
  }

  return config;
}

export function extractMessageExternalId(message: Message): string | null {
  const rawId = (message as unknown as { id?: unknown }).id;
  if (!rawId) {
    return null;
  }

  if (typeof rawId === 'string') {
    return rawId;
  }

  if (typeof rawId === 'object') {
    const candidate = rawId as {
      _serialized?: unknown;
      id?: unknown;
    };
    if (typeof candidate._serialized === 'string') {
      return candidate._serialized;
    }
    if (typeof candidate.id === 'string') {
      return candidate.id;
    }
  }

  return null;
}

export function resolveMessageDate(message: Message): Date {
  const raw =
    (message as unknown as { timestamp?: unknown }).timestamp ??
    (message as unknown as { t?: unknown }).t;

  const numeric = Number(raw);
  if (!Number.isNaN(numeric) && numeric > 0) {
    const millis = numeric > 3_000_000_000 ? numeric : numeric * 1000;
    return new Date(millis);
  }

  return new Date();
}

export function evaluateFlowSelection(
  nodes: FlowNode[],
  normalizedBody: string,
  currentFlowNodeId?: number | null
): FlowExecutionResult | null {
  let currentNode: FlowNode | undefined = undefined;
  if (typeof currentFlowNodeId === 'number') {
    currentNode = flattenFlowTree(nodes).find(
      (n) => n.id === currentFlowNodeId
    );
  }
  let candidates: FlowNode[] = [];
  if (currentNode) {
    if (currentNode.children.length > 0) {
      // Si el nodo actual tiene hijos, solo evaluar esos hijos activos
      candidates = currentNode.children.filter((n) => n.isActive);
    } else {
      // Si no tiene hijos, revisar condiciones en metadata
      const builder =
        currentNode.metadata && typeof currentNode.metadata === 'object'
          ? (currentNode.metadata as any).builder
          : undefined;
      if (builder && Array.isArray(builder.conditions)) {
        const condition = builder.conditions.find(
          (cond: any) => cond.match === normalizedBody
        );
        if (condition && condition.targetId) {
          // Buscar el nodo destino por targetId
          const targetNode = flattenFlowTree(nodes).find((n) => {
            if (n.metadata && typeof n.metadata === 'object') {
              const builder = (n.metadata as any).builder;
              return (
                builder &&
                String(builder.reactId) === String(condition.targetId)
              );
            }
            return false;
          });
          if (targetNode && targetNode.isActive) {
            candidates = [targetNode];
          }
        }
      }
      // Fallback: Si no hay candidatos, buscar nodos hermanos activos (mismo parentId)
      if (!candidates.length && typeof currentNode.parentId === 'number') {
        candidates = nodes.filter(
          (n) =>
            n.parentId === currentNode.parentId &&
            n.id !== currentNode.id &&
            n.isActive
        );
      }
      // Fallback: Si aún no hay candidatos, buscar nodos raíz activos
      if (!candidates.length) {
        candidates = nodes.filter((n) => n.parentId == null && n.isActive);
      }
    }
  } else {
    // Si no hay nodo actual, buscar entre los nodos raíz activos
    candidates = nodes.filter((n) => n.parentId == null && n.isActive);
  }

  const match = candidates.find((node) => {
    if (!node.trigger) return false;
    return matchesTrigger(node.trigger, normalizedBody);
  });

  if (!match) {
    return null;
  }

  const result: FlowExecutionResult = {
    reply: match.message,
    matchedNode: match,
  };

  if (match.type === 'REDIRECT') {
    result.redirectAreaId = match.areaId ?? null;
    result.pauseBot = true;
  } else if (match.type === 'END') {
    result.pauseBot = false;
  }

  return result;
}

function formatMessageRecord(
  conversationId: bigint | number,
  message: ConversationMessage
): MessageEventPayload {
  return {
    id: message.id.toString(),
    conversationId: BigInt(conversationId).toString(),
    senderType: message.senderType,
    senderId: message.senderId ?? null,
    senderName: message.sender?.name ?? null,
    senderUsername: message.sender?.username ?? null,
    content: message.content,
    mediaType: message.mediaType ?? null,
    mediaUrl: message.mediaUrl ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function broadcastConversationUpdate(
  io: SocketIOServer | undefined,
  conversationId: bigint | number
) {
  if (!io) return null;
  const snapshot = await fetchConversationSnapshot(conversationId);
  if (!snapshot) return null;

  const rooms = conversationRooms(snapshot);
  rooms.forEach((room) =>
    emitToRoom(io, room, 'conversation:update', snapshot)
  );

  // NO emitir broadcast duplicado - solo a rooms específicos
  // io.emit('conversation:update', snapshot);

  return snapshot;
}

export async function broadcastConversationEvent(
  io: SocketIOServer | undefined,
  conversationId: bigint | number,
  event: string
) {
  if (!io) return null;
  const snapshot = await fetchConversationSnapshot(conversationId);
  if (!snapshot) return null;
  const rooms = conversationRooms(snapshot);
  rooms.forEach((room) => emitToRoom(io, room, event, snapshot));
  return snapshot;
}

export async function broadcastMessageRecord(
  io: SocketIOServer | undefined,
  conversationId: bigint | number,
  message: ConversationMessage,
  extraUserIds: number[] = []
) {
  if (!io) return;
  const snapshot = await fetchConversationSnapshot(conversationId);
  if (!snapshot) return;

  const payload = formatMessageRecord(conversationId, message);
  const rooms = conversationRooms(snapshot);
  extraUserIds.forEach((userId) => rooms.add(`user:${userId}`));

  // Emitir a todos los rooms específicos
  rooms.forEach((room) => emitToRoom(io, room, 'message:new', payload));

  // TAMBIÉN emitir globalmente para que llegue a clientes que no están en el room
  // (ej: usuarios que cerraron el chat pero siguen conectados)
  io.emit('message:new', payload);
  console.log(
    `[SOCKET] Global broadcast of message:new for conversation ${conversationId}`
  );
}

function extractPhoneNumber(whatsappId: string): string {
  // Remover el sufijo @c.us y otros formatos de WhatsApp
  return whatsappId.replace(/@c\.us$|@g\.us$|@s\.whatsapp\.net$/g, '');
}

async function getContactInfoFromWhatsApp(
  client: Whatsapp,
  phoneNumber: string
): Promise<{ name: string | null; number: string; photoUrl?: string | null }> {
  const cleanNumber = extractPhoneNumber(phoneNumber);

  try {
    // Intentar obtener información del contacto desde WhatsApp
    const contactInfo = await client.getContact(phoneNumber);
    if (contactInfo) {
      const contactName =
        contactInfo.name ||
        contactInfo.pushname ||
        contactInfo.shortName ||
        null;
      const photoUrl = (contactInfo as any).profilePicThumbObj?.imgFull || null;

      console.log(
        `[WPP] Contact info for ${cleanNumber}: name="${contactName}", photo=${!!photoUrl}`
      );
      return { name: contactName, number: cleanNumber, photoUrl };
    }
  } catch (error) {
    console.warn(`[WPP] Could not get contact info for ${cleanNumber}:`, error);
  }

  return { name: null, number: cleanNumber };
}

async function ensureConversation(
  ownerUserId: number,
  contactNumber: string,
  io: SocketIOServer | undefined,
  client?: Whatsapp
) {
  // Extraer número limpio y obtener información del contacto desde WhatsApp
  const cleanNumber = extractPhoneNumber(contactNumber);
  let contactName: string | null = null;
  let contactPhotoUrl: string | null = null;

  if (client) {
    const contactInfo = await getContactInfoFromWhatsApp(client, contactNumber);
    contactName = contactInfo.name;
    contactPhotoUrl = contactInfo.photoUrl || null;
  }

  const { contact, created: contactCreated } = await findOrCreateContactByPhone(
    cleanNumber,
    { name: contactName, photoUrl: contactPhotoUrl }
  );

  // TODO: Función downloadAndSaveProfilePicture fue eliminada
  // Si obtuvimos una foto de WhatsApp, descargarla y guardarla localmente
  // if (contactPhotoUrl) {
  //   const localPhotoUrl = await downloadAndSaveProfilePicture(
  //     contactPhotoUrl,
  //     contactName || cleanNumber
  //   );
  //   if (localPhotoUrl) {
  //     await (prisma.contact.update as any)({
  //       where: { id: contact.id },
  //       data: { photoUrl: localPhotoUrl },
  //     });
  //   }
  // }

  const existing = await findOpenConversationByPhone(cleanNumber);
  if (existing) {
    let conversation = existing;
    const updates: Prisma.ConversationUpdateInput = {};

    if (!existing.contactId || existing.contactId !== contact.id) {
      updates.contact = { connect: { id: contact.id } };
    }
    if (existing.contactName !== contact.name) {
      updates.contactName = contact.name;
    }

    if (Object.keys(updates).length) {
      await touchConversation(existing.id, updates);
      conversation = {
        ...existing,
        contactId: contact.id,
        contactName: contact.name,
        contact,
      };
    } else if (!conversation.contact) {
      conversation = { ...conversation, contact };
    }

    return {
      conversation,
      created: false,
      contact,
      contactCreated,
    };
  }

  // Obtener el bot por defecto o el primero disponible
  const { getDefaultBot } = await import('./default-bot.service.js');
  const defaultBot = await getDefaultBot();
  const botId = defaultBot?.id ?? 1;

  const created = await createConversation({
    userPhone: cleanNumber,
    contactName: contact.name,
    contactId: contact.id,
    status: 'PENDING',
    botActive: true,
    botId,
  });

  console.log(
    `[CONVERSATION] New conversation created with ID: ${created.id}, fetching snapshot...`
  );

  const snapshot = await fetchConversationSnapshot_Full(created.id);
  if (!snapshot) {
    console.error(
      `[CONVERSATION] ❌ Failed to fetch snapshot for conversation ${created.id}`
    );
    return {
      conversation: created,
      created: true,
      contact,
      contactCreated: true,
    };
  }

  console.log(
    `[CONVERSATION] ✅ Snapshot fetched successfully for conversation ${created.id}`
  );

  // Emitir evento global de actualización
  if (io) {
    io.emit('conversation:update', snapshot);
    io.emit('conversation:new', {
      conversation: snapshot,
      source: 'incoming_message',
    });
    console.log(
      `[CONVERSATION] 📢 Emitted conversation:update for ${created.id}`
    );
  }

  // Emitir evento de conversación entrante
  await broadcastConversationEvent(io, created.id, 'conversation:incoming');

  // Emitir evento global para que se vea la nueva conversación en todas partes
  if (io) {
    io.emit('conversation:new', {
      conversation: snapshot,
      source: 'incoming_message',
    });
    console.log(
      `[CONVERSATION] ✅ Emitted conversation:new for ${created.id} to ALL clients`
    );
  }

  return {
    conversation: created,
    created: true,
    contact,
    contactCreated: true,
  };
}

export async function resolveTemplateVariables(
  conversationId: bigint,
  rawText: string
): Promise<string> {
  if (!rawText) {
    return rawText;
  }

  const needsCurlyInterpolation = rawText.includes('{');
  const needsFlowInterpolation = /\$\$(\w+)/.test(rawText);

  if (!needsCurlyInterpolation && !needsFlowInterpolation) {
    return rawText;
  }

  const convWithContext = await prisma.conversation.findUnique({
    where: { id: BigInt(conversationId) },
    select: {
      context: true,
      userPhone: true,
      contactName: true,
      contact: {
        select: {
          name: true,
          phone: true,
          dni: true,
        },
      },
      areaId: true,
      status: true,
    },
  });

  if (!convWithContext) {
    return rawText;
  }

  let parsedContext: Record<string, unknown> = {};
  const rawContext = convWithContext.context;

  if (typeof rawContext === 'string' && rawContext.length) {
    try {
      parsedContext = JSON.parse(rawContext);
    } catch (parseError) {
      console.warn(
        '[resolveTemplateVariables] Failed to parse conversation context JSON:',
        parseError
      );
    }
  } else if (
    rawContext &&
    typeof rawContext === 'object' &&
    !Array.isArray(rawContext)
  ) {
    parsedContext = rawContext as Record<string, unknown>;
  }

  const hydratedContext = enrichContextWithGlobalVariables(
    parsedContext as any,
    {
      userPhone:
        convWithContext.userPhone ??
        convWithContext.contact?.phone ??
        undefined,
      contactName:
        convWithContext.contact?.name ??
        convWithContext.contactName ??
        undefined,
      dni: convWithContext.contact?.dni ?? undefined,
      areaId: convWithContext.areaId ?? undefined,
      conversationStatus: convWithContext.status ?? undefined,
    }
  );

  let finalText = rawText;
  if (needsCurlyInterpolation) {
    finalText = finalText.replace(/\{(\w+)\}/g, (match, variableName) =>
      String((hydratedContext as any)[variableName] ?? match)
    );
  }

  if (needsFlowInterpolation) {
    finalText = interpolateVariables(finalText, hydratedContext as any);
  }

  return finalText;
}

async function sendReply(
  ownerUserId: number,
  client: Whatsapp,
  conversationId: bigint,
  message: Message,
  replyOrEvaluation: string | FlowExecutionResult,
  io?: SocketIOServer
) {
  const evaluation =
    typeof replyOrEvaluation === 'string' ? null : replyOrEvaluation;
  let finalReplyText =
    typeof replyOrEvaluation === 'string'
      ? replyOrEvaluation
      : replyOrEvaluation.reply;

  finalReplyText = await resolveTemplateVariables(
    conversationId,
    finalReplyText
  );

  let outbound: Message | null = null;

  if (evaluation) {
    const builderConfig = parseBuilderConfig(evaluation.matchedNode);
    try {
      if (builderConfig.messageType === 'BUTTONS') {
        const buttons = builderConfig.options
          .filter((option) => option.label || option.trigger)
          .slice(0, 3)
          .map((option) => ({
            buttonId: option.trigger || option.id,
            buttonText: option.label || option.trigger || option.id,
          }));

        if (buttons.length) {
          const title = builderConfig.buttonTitle ?? '';
          const footer = builderConfig.buttonFooter ?? '';
          const raw = await (client as any).sendButtons(
            message.from,
            finalReplyText,
            buttons,
            title,
            footer
          );
          outbound = raw && typeof raw === 'object' ? (raw as Message) : null;
        }
      } else if (builderConfig.messageType === 'LIST') {
        const rows = builderConfig.options
          .filter((option) => option.label || option.trigger)
          .map((option) => ({
            rowId: option.trigger || option.id,
            title: option.label || option.trigger || option.id,
            description: '',
          }));

        if (rows.length) {
          const sectionTitle =
            builderConfig.listTitle || builderConfig.buttonTitle || 'Opciones';
          const buttonText = builderConfig.listButtonText ?? 'Ver opciones';
          const listDescription = builderConfig.listDescription ?? '';

          const sections = [
            {
              title: sectionTitle,
              rows,
            },
          ];

          const raw = await (client as any).sendListMessage(
            message.from,
            finalReplyText,
            buttonText,
            sections,
            sectionTitle,
            listDescription
          );
          outbound = raw && typeof raw === 'object' ? (raw as Message) : null;
        }
      }
    } catch (error) {
      console.error('[WPP] Failed to send interactive message', error);
      outbound = null;
    }
  }

  if (!outbound) {
    const rawMessage = await client.sendText(message.from, finalReplyText);
    outbound =
      rawMessage && typeof rawMessage === 'object'
        ? (rawMessage as Message)
        : null;
  }

  const record = await createConversationMessage({
    conversationId,
    senderType: 'BOT',
    senderId: ownerUserId,
    content: finalReplyText,
    isDelivered: Boolean(outbound),
    externalId: outbound ? extractMessageExternalId(outbound) : null,
    createdAt: outbound ? resolveMessageDate(outbound) : new Date(),
  });

  await broadcastMessageRecord(io, conversationId, record, [ownerUserId]);
  await broadcastConversationUpdate(io, conversationId);
}

async function handleIncomingMessage(
  ownerUserId: number,
  message: Message,
  client: Whatsapp,
  io?: SocketIOServer
) {
  const messageAny = message as any;
  let bodyValue: unknown = message.body ?? message.caption ?? '';
  let body =
    typeof bodyValue === 'string' ? bodyValue : String(bodyValue ?? '');

  const externalId = extractMessageExternalId(message);

  if (messageAny) {
    if (
      typeof messageAny.selectedButtonId === 'string' &&
      messageAny.selectedButtonId.length
    ) {
      body = messageAny.selectedButtonId;
    } else if (
      typeof messageAny.selectedButtonText === 'string' &&
      messageAny.selectedButtonText.length
    ) {
      body = messageAny.selectedButtonText;
    }

    if (
      typeof messageAny.selectedRowId === 'string' &&
      messageAny.selectedRowId.length
    ) {
      body = messageAny.selectedRowId;
    }

    const singleSelectReply =
      messageAny?.listResponse?.singleSelectReply ??
      messageAny?.selectedRow?.singleSelectReply;
    if (
      singleSelectReply &&
      typeof singleSelectReply.selectedRowId === 'string' &&
      singleSelectReply.selectedRowId.length
    ) {
      body = singleSelectReply.selectedRowId;
    }
  }

  const normalizedBody = normalizeText(body);

  const ensureResult = await ensureConversation(
    ownerUserId,
    message.from,
    io,
    client
  );
  let conversation = ensureResult.conversation;
  const contact = ensureResult.contact;
  const conversationId = BigInt(conversation.id);

  if (externalId) {
    // Verificar cache de procesamiento antes de consultar la base de datos
    if (isMessageBeingProcessed(externalId)) {
      console.log('[WPP] Message already being processed:', externalId);
      return;
    }

    const duplicate = await findMessageByExternalId(externalId);
    if (duplicate) {
      console.log('[WPP] Duplicate message found in database:', externalId);
      return;
    }

    // Marcar mensaje como procesándose
    markMessageAsProcessing(externalId);
  }

  const receivedAt = resolveMessageDate(message);
  const flows = await listFlowTree({
    createdBy: ownerUserId,
    includeInactive: false,
  });
  const primaryMenu = buildPrimaryMenuMessage(flows);

  const caption =
    typeof messageAny?.caption === 'string' && messageAny.caption.trim().length
      ? messageAny.caption.trim()
      : null;
  const bodyIsBase64 = isBase64String(body);
  const messageTypeRaw =
    typeof messageAny.type === 'string' ? messageAny.type : '';
  const messageFilename =
    typeof messageAny.filename === 'string' && messageAny.filename.trim().length
      ? messageAny.filename.trim()
      : null;
  const messageMimetype =
    typeof messageAny.mimetype === 'string' && messageAny.mimetype.trim().length
      ? messageAny.mimetype.trim()
      : null;

  let finalContent = caption ?? (bodyIsBase64 ? '' : body);
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;

  try {
    console.log(
      `[WPP] Message type: ${messageTypeRaw}, hasMedia: ${messageAny.hasMedia}`
    );

    if (
      ['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(
        messageTypeRaw
      )
    ) {
      try {
        const mediaData = await client.downloadMedia(message);
        if (mediaData && mediaData.length > 50) {
          const stored = await persistBase64Media(mediaData, messageTypeRaw, {
            mimetype: messageMimetype,
            filename: messageFilename,
          });
          if (stored) {
            mediaUrl = stored.url;
            mediaType = stored.mediaType;
            finalContent = buildMediaDescription(
              messageTypeRaw,
              messageFilename,
              caption
            );
          }
        }
      } catch (downloadError) {
        console.error(
          `[WPP] Error downloading media for ${messageTypeRaw}:`,
          downloadError
        );
      }

      if (!mediaUrl && bodyIsBase64) {
        const stored = await persistBase64Media(body, messageTypeRaw, {
          mimetype: messageMimetype,
          filename: messageFilename,
        });
        if (stored) {
          mediaUrl = stored.url;
          mediaType = stored.mediaType;
          finalContent = buildMediaDescription(
            messageTypeRaw,
            messageFilename,
            caption
          );
        }
      }
    } else if (
      messageTypeRaw === 'location' &&
      messageAny.lat &&
      messageAny.lng
    ) {
      const lat = Number(messageAny.lat);
      const lng = Number(messageAny.lng);
      mediaType = 'location';
      mediaUrl = resolveMapsUrl(lat, lng);
      finalContent = caption ?? buildLocationDescription(lat, lng);
    } else if (bodyIsBase64) {
      const stored = await persistBase64Media(
        body,
        messageTypeRaw || 'document',
        {
          mimetype: messageMimetype,
          filename: messageFilename,
        }
      );
      if (stored) {
        mediaUrl = stored.url;
        mediaType = stored.mediaType;
        finalContent = buildMediaDescription(
          messageTypeRaw || 'document',
          messageFilename,
          caption
        );
      }
    }
  } catch (error) {
    console.error('[WPP] Error in multimedia processing:', error);
  }

  if (!finalContent || !finalContent.trim()) {
    if (mediaType === 'location' && messageAny.lat && messageAny.lng) {
      finalContent = buildLocationDescription(
        Number(messageAny.lat),
        Number(messageAny.lng)
      );
    } else if (mediaType) {
      finalContent = buildMediaDescription(
        messageTypeRaw,
        messageFilename,
        caption
      );
    } else if (!bodyIsBase64 && body.trim().length) {
      finalContent = body.trim();
    } else if (caption) {
      finalContent = caption;
    } else {
      finalContent = 'Mensaje recibido';
    }
  }

  if (bodyIsBase64 && finalContent === body) {
    finalContent = buildMediaDescription(
      messageTypeRaw,
      messageFilename,
      caption
    );
  }

  const record = await createConversationMessage({
    conversationId,
    senderType: 'CONTACT',
    content: finalContent,
    mediaUrl,
    mediaType,
    externalId,
    createdAt: receivedAt,
  });

  const touchData: Prisma.ConversationUpdateInput = {
    lastActivity: record.createdAt,
  };

  // Detectar si hay cambio de status significativo
  let statusChanged = false;
  if (conversation.status === 'PENDING') {
    touchData.status = 'ACTIVE';
    conversation = { ...conversation, status: 'ACTIVE' };
    statusChanged = true;
  }

  await touchConversation(conversationId, touchData);
  conversation = {
    ...conversation,
    lastActivity: record.createdAt,
    contact: contact ?? conversation.contact,
    contactName:
      conversation.contactName ?? contact?.name ?? conversation.contactName,
  };

  await broadcastMessageRecord(io, conversationId, record, [ownerUserId]);

  // Solo emitir conversation:update si hay cambios significativos en metadata
  // Evita race conditions donde el frontend recarga todo el historial innecesariamente
  if (statusChanged || ensureResult.created) {
    console.log(
      '[WPP] Status changed or new conversation, broadcasting update'
    );
    await broadcastConversationUpdate(io, conversationId);
  } else {
    console.log(
      '[WPP] Only message received, no conversation:update event emitted'
    );
  }

  if (!conversation.botActive) {
    return;
  }

  if (ensureResult.created) {
    const allNodes = flattenFlowTree(flows);
    const startNode = allNodes.find(
      (node) => node.type === 'START' && node.isActive
    );

    if (startNode) {
      console.log('[FLOW] Found START node:', startNode.id);
      const connection = await prisma.flowConnection.findFirst({
        where: { fromId: startNode.id },
      });

      if (connection && connection.toId) {
        console.log(
          '[FLOW] Found connection from START to node:',
          connection.toId
        );
        const firstNode = allNodes.find((n) => n.id === connection.toId);

        if (firstNode && firstNode.isActive) {
          console.log(
            '[FLOW] Executing first node:',
            firstNode.id,
            firstNode.name
          );
          const evaluation: FlowExecutionResult = {
            reply: firstNode.message,
            matchedNode: firstNode,
          };

          await touchConversation(conversationId, {
            currentFlowNodeId: evaluation.matchedNode.id,
          });

          await sendReply(
            ownerUserId,
            client,
            conversationId,
            message,
            evaluation,
            io
          );
          return; // Exit after handling the start node
        }
      }
    }

    // Fallback to primary menu if START node logic fails
    if (primaryMenu) {
      await sendReply(
        ownerUserId,
        client,
        conversationId,
        message,
        primaryMenu,
        io
      );
    }

    // Marcar mensaje como completado al finalizar el flujo
    if (externalId) {
      markMessageAsCompleted(externalId);
    }
    return;
  }

  const convState = await prisma.conversation.findUnique({
    where: { id: BigInt(conversationId) },
    select: { currentFlowNodeId: true, context: true },
  });
  const currentId = convState?.currentFlowNodeId;
  console.log('[FLOW] State before routing:', {
    conversationId,
    currentFlowNodeId: convState?.currentFlowNodeId,
    hasContext: Boolean(convState?.context),
  });

  const previousNodeId = currentId;

  // Si no hay previousNodeId (conversación sin nodo actual), iniciar desde START
  if (!previousNodeId) {
    console.log(
      '[FLOW] No previous node ID, attempting to start from START node'
    );
    const allNodes = flattenFlowTree(flows);
    const startNode = allNodes.find(
      (node) => node.type === 'START' && node.isActive
    );

    if (startNode) {
      console.log('[FLOW] Found START node for continuation:', startNode.id);
      const connection = await prisma.flowConnection.findFirst({
        where: { fromId: startNode.id },
      });

      if (connection && connection.toId) {
        console.log(
          '[FLOW] Found connection from START to node:',
          connection.toId
        );
        const firstNode = allNodes.find((n) => n.id === connection.toId);

        if (firstNode && firstNode.isActive) {
          console.log(
            '[FLOW] Executing first node after START:',
            firstNode.id,
            firstNode.name
          );

          // Enriquecer contexto con variables globales
          const initialContext: import('../services/flow.service').ConversationContext =
            {
              lastMessage: typeof body === 'string' ? body : String(body ?? ''),
              previousNode: startNode.id,
              updatedAt: new Date().toISOString(),
            };

          const enrichedContext = enrichContextWithGlobalVariables(
            initialContext,
            {
              userPhone: conversation.userPhone ?? undefined,
              contactName:
                contact?.name ?? conversation.contactName ?? undefined,
              dni: contact?.dni ?? undefined,
              // Otros datos de contacto si están disponibles
            }
          );

          // Ejecutar el nodo con contexto enriquecido
          if (!conversation.botId) {
            console.log(`[FLOW] Invalid botId`);
            return;
          }

          try {
            const chainResult = await executeNodeChain({
              botId: conversation.botId,
              nodeId: firstNode.id,
              context: enrichedContext,
            });
            console.log('[FLOW] executeNodeChain result (start):', {
              conversationId,
              startNodeId: firstNode.id,
              nextNodeId: chainResult.nextNodeId,
              actions: chainResult.actions?.map((a) => a.type),
            });

            if (chainResult.actions && chainResult.actions.length > 0) {
              console.log(
                `[FLOW] Procesando ${chainResult.actions.length} acciones:`,
                JSON.stringify(chainResult.actions)
              );

              // Actualizar el contexto en la conversación
              await touchConversation(conversationId, {
                context: JSON.stringify(chainResult.updatedContext),
                currentFlowNodeId: chainResult.nextNodeId,
              });
              console.log('[FLOW] Conversation updated after start:', {
                conversationId,
                currentFlowNodeId: chainResult.nextNodeId,
              });

              // Procesar mensajes
              const sendMessageAction = chainResult.actions.find(
                (a) => a.type === 'send_message'
              );
              if (
                sendMessageAction &&
                sendMessageAction.payload &&
                typeof sendMessageAction.payload === 'object'
              ) {
                const payload = sendMessageAction.payload as Record<
                  string,
                  unknown
                >;
                const messageText = (payload.message as string) ?? '';
                await sendReply(
                  ownerUserId,
                  client,
                  conversationId,
                  message,
                  messageText,
                  io
                );
              }

              // Verificar si hay acción end_flow (también puede ocurrir desde START)
              const endFlowAction = chainResult.actions.find(
                (a) => a.type === 'end_flow'
              );
              const shouldCreateOrder =
                endFlowAction?.payload &&
                typeof endFlowAction.payload === 'object'
                  ? (endFlowAction.payload as Record<string, unknown>)
                      .shouldCreateOrder === true
                  : false;

              // Crear orden si llegó al nodo END desde START
              if (shouldCreateOrder) {
                try {
                  await createOrderFromCompletedFlow(
                    Number(conversationId),
                    chainResult.updatedContext,
                    contact,
                    conversation
                  );
                  console.log(
                    `[FLOW] Orden creada exitosamente para conversación ${conversationId} (desde START)`
                  );
                } catch (orderError) {
                  console.error(
                    `[FLOW] Error creando orden para conversación ${conversationId}:`,
                    orderError
                  );
                }
              }
            }
            return;
          } catch (error) {
            console.error(
              '[FLOW] Error executing node chain from START:',
              error
            );
            // Fallback to primary menu if START node execution fails
            if (primaryMenu) {
              await sendReply(
                ownerUserId,
                client,
                conversationId,
                message,
                primaryMenu,
                io
              );
            }
            return;
          }
        }
      }
    }

    // Fallback to primary menu if START node logic fails (should not reach here)
    if (primaryMenu) {
      await sendReply(
        ownerUserId,
        client,
        conversationId,
        message,
        primaryMenu,
        io
      );
    }

    if (externalId) {
      markMessageAsCompleted(externalId);
    }
    return;
  }

  // Si hay previousNodeId, intentar continuar la cadena automáticamente
  if (previousNodeId) {
    console.log(
      `[FLOW] Continuing from node ${previousNodeId}, executing next node automatically`
    );

    try {
      const nextConnection = await prisma.flowConnection.findFirst({
        where: { fromId: previousNodeId },
      });

      if (nextConnection && nextConnection.toId) {
        console.log(
          `[FLOW] Found connection: ${previousNodeId} -> ${nextConnection.toId}`
        );

        if (!conversation.botId) {
          console.log(`[FLOW] Invalid botId`);
          return;
        }

        // Obtener contexto actual
        const currentContextRaw =
          convState?.context && typeof convState.context === 'string'
            ? JSON.parse(convState.context)
            : typeof convState.context === 'object' &&
              !Array.isArray(convState.context)
            ? convState.context
            : {};

        const workingContext: Record<string, unknown> =
          currentContextRaw && typeof currentContextRaw === 'object'
            ? { ...currentContextRaw }
            : {};

        let capturedVariableName: string | null = null;
        const waitingForInput = Boolean(
          (workingContext as any).waitingForInput
        );
        const waitingVariable =
          waitingForInput &&
          typeof (workingContext as any).waitingVariable === 'string'
            ? ((workingContext as any).waitingVariable as string)
            : null;

        if (waitingVariable) {
          const valueToCapture = finalContent;

          (workingContext as any)[waitingVariable] = valueToCapture;

          if (
            workingContext.variables &&
            typeof workingContext.variables === 'object' &&
            !Array.isArray(workingContext.variables)
          ) {
            (workingContext.variables as Record<string, unknown>)[
              waitingVariable
            ] = valueToCapture;
          } else {
            workingContext.variables = { [waitingVariable]: valueToCapture };
          }

          (workingContext as any).waitingForInput = false;
          (workingContext as any).waitingVariable = null;
          capturedVariableName = waitingVariable;
          console.log('[FLOW] Captured variable from message:', {
            conversationId,
            waitingVariable,
            value: valueToCapture,
          });
        }

        // Enriquecer el contexto con variables globales del contacto
        const enrichedContext = enrichContextWithGlobalVariables(
          workingContext as any,
          {
            userPhone: conversation.userPhone,
            contactName: conversation.contactName,
            dni: contact?.dni ?? undefined,
            conversationStatus: conversation.status,
          }
        );

        const chainResult = await executeNodeChain({
          botId: conversation.botId,
          nodeId: nextConnection.toId,
          context:
            enrichedContext as unknown as import('../services/flow.service').ConversationContext,
          capturedVariableName,
        });
        console.log('[FLOW] executeNodeChain result (continuation):', {
          conversationId,
          nextNodeId: chainResult.nextNodeId,
          actions: chainResult.actions?.map((a) => a.type),
        });

        await touchConversation(conversationId, {
          context: JSON.stringify(chainResult.updatedContext),
          currentFlowNodeId: chainResult.nextNodeId,
        });
        console.log('[FLOW] Conversation updated after continuation:', {
          conversationId,
          currentFlowNodeId: chainResult.nextNodeId,
        });

        if (chainResult.actions && chainResult.actions.length > 0) {
          console.log(
            `[FLOW] Procesando ${chainResult.actions.length} acciones`,
            JSON.stringify(chainResult.actions)
          );

          // Procesar mensajes
          const sendMessageAction = chainResult.actions.find(
            (a) => a.type === 'send_message'
          );
          if (
            sendMessageAction &&
            sendMessageAction.payload &&
            typeof sendMessageAction.payload === 'object'
          ) {
            const payload = sendMessageAction.payload as Record<
              string,
              unknown
            >;
            const messageText = (payload.message as string) ?? '';
            await sendReply(
              ownerUserId,
              client,
              conversationId,
              message,
              messageText,
              io
            );
          }

          // Procesar notas
          const saveNoteActions = chainResult.actions.filter(
            (a) => a.type === 'save_note'
          );

          for (const saveNoteAction of saveNoteActions) {
            if (
              saveNoteAction &&
              saveNoteAction.payload &&
              typeof saveNoteAction.payload === 'object'
            ) {
              const payload = saveNoteAction.payload as Record<string, unknown>;
              const noteContent = (payload.content as string) ?? '';
              if (noteContent) {
                await addConversationNote(
                  BigInt(conversationId),
                  noteContent,
                  null
                );
              }
            }
          }
        }

        // Verificar si hay acción end_flow para desactivar el bot
        const endFlowAction = chainResult.actions.find(
          (a) => a.type === 'end_flow'
        );
        const shouldDeactivateBot =
          endFlowAction?.payload && typeof endFlowAction.payload === 'object'
            ? (endFlowAction.payload as Record<string, unknown>)
                .shouldDeactivateBot === true
            : false;

        const shouldCreateOrder =
          endFlowAction?.payload && typeof endFlowAction.payload === 'object'
            ? (endFlowAction.payload as Record<string, unknown>)
                .shouldCreateOrder === true
            : false;

        // Crear orden si llegó al nodo END y completó el flujo
        if (shouldCreateOrder) {
          try {
            await createOrderFromCompletedFlow(
              Number(conversationId),
              chainResult.updatedContext,
              contact,
              conversation
            );
            console.log(
              `[FLOW] Orden creada exitosamente para conversación ${conversationId}`
            );
          } catch (orderError) {
            console.error(
              `[FLOW] Error creando orden para conversación ${conversationId}:`,
              orderError
            );
          }
        }

        // Guardar contexto final
        await touchConversation(conversationId, {
          currentFlowNodeId: chainResult.nextNodeId,
          context: JSON.stringify(chainResult.updatedContext),
          ...(shouldDeactivateBot && { botActive: false }),
        });

        if (shouldDeactivateBot) {
          console.log(
            `[FLOW] END node ejecutado, bot desactivado para conversación ${conversationId}`
          );
          await broadcastConversationUpdate(io, conversationId);

          if (io) {
            const snapshot = await fetchConversationSnapshot(conversationId);
            if (snapshot) {
              io.emit('conversation:end_flow', {
                conversationId,
                botActive: false,
                snapshot,
              });
            }
          }
        }

        return;
      }
    } catch (error) {
      console.error(
        '[FLOW] Error executing node chain from previous node:',
        error
      );
      // Continue with fallback logic
    }
  }

  // Fallback: usar evaluateFlowSelection si no hay continuación automática
  let evaluation = evaluateFlowSelection(flows, normalizedBody, currentId);

  if (!evaluation) {
    console.log('[FLOW] No match in current context, trying root nodes.');
    evaluation = evaluateFlowSelection(flows, normalizedBody, undefined);
  }

  if (evaluation) {
    console.log(
      '[FLOW] Nodo evaluado:',
      evaluation.matchedNode.id,
      evaluation.matchedNode.name
    );

    await touchConversation(conversationId, {
      currentFlowNodeId: evaluation.matchedNode.id,
    });
    const convAfter = await prisma.conversation.findUnique({
      where: { id: BigInt(conversationId) },
      select: { currentFlowNodeId: true },
    });
    console.log(
      '[FLOW] currentFlowNodeId después:',
      convAfter?.currentFlowNodeId
    );

    await sendReply(
      ownerUserId,
      client,
      conversationId,
      message,
      evaluation,
      io
    );

    if (evaluation.redirectAreaId !== undefined) {
      const areaId = evaluation.redirectAreaId;

      if (areaId !== null) {
        const area = await prisma.area.findUnique({
          where: { id: areaId },
          include: { workingHours: true },
        });

        if (area) {
          let withinSchedule = true;
          if (area.workingHours.length) {
            withinSchedule = checkIfWithinWorkingHours(
              dayjs(),
              area.workingHours
            );
          }

          if (!withinSchedule) {
            const messageText = formatAfterHoursMessage(
              area.workingHours[0],
              AFTER_HOURS_MESSAGE
            );
            await sendReply(
              ownerUserId,
              client,
              conversationId,
              message,
              messageText,
              io
            );
            await touchConversation(conversationId, {
              area: { connect: { id: areaId } },
              lastActivity: record.createdAt,
              status: 'PENDING',
              botActive: true,
            });
            await broadcastConversationUpdate(io, conversationId);
            await addConversationEvent(
              conversationId,
              'NOTE',
              {
                type: 'after_hours',
                areaId,
                message: messageText,
              },
              ownerUserId
            );
            logSystem('Mensaje de ausencia enviado');

            // Marcar mensaje como completado antes del return
            if (externalId) {
              markMessageAsCompleted(externalId);
            }
            return;
          }
        }
      }

      const { operatorId } = await assignConversationToArea(
        conversationId,
        areaId,
        { requestedById: ownerUserId }
      );
      await broadcastConversationUpdate(io, conversationId);

      if (!operatorId) {
        await broadcastConversationEvent(
          io,
          conversationId,
          'conversation:pending_assignment'
        );
      }
    }

    // Marcar mensaje como completado al finalizar
    if (externalId) {
      markMessageAsCompleted(externalId);
    }
    return;
  }

  if (primaryMenu) {
    console.log('[FLOW] No match found, sending primary menu.');
    await sendReply(
      ownerUserId,
      client,
      conversationId,
      message,
      primaryMenu,
      io
    );
  }

  // Marcar mensaje como completado al final de la función
  if (externalId) {
    markMessageAsCompleted(externalId);
  }
}

function attachMessageHandlers(
  ownerUserId: number,
  client: Whatsapp,
  io?: SocketIOServer
) {
  client.onMessage(async (message) => {
    const externalId = extractMessageExternalId(message);
    const finishTrackedTask = beginTrackedTask('incoming-message');
    try {
      const cache = sessions.get(ownerUserId);
      if (!cache || cache.paused) {
        finishTrackedTask();
        return;
      }
      await handleIncomingMessage(ownerUserId, message, client, io);
    } catch (error) {
      console.error('[WPP] Error handling incoming message', error);

      // Asegurar que se marque como completado incluso en caso de error
      if (externalId) {
        markMessageAsCompleted(externalId);
      }

      emitToRoom(io, `user:${ownerUserId}`, 'session:error', {
        message: error instanceof Error ? error.message : String(error),
      });
      await upsertBotSession(ownerUserId, { status: 'ERROR' });
    } finally {
      finishTrackedTask();
    }
  });
}

async function upsertBotSession(
  ownerUserId: number,
  data: Partial<Prisma.BotSessionUncheckedUpdateInput>
) {
  await prisma.botSession.upsert({
    where: {
      ownerUserId_sessionName: {
        ownerUserId,
        sessionName: 'default',
      },
    },
    create: {
      ownerUserId,
      sessionName: 'default',
      status: (data.status as BotSessionStatus | undefined) ?? 'CONNECTING',
      connectedAt: (data.connectedAt as Date | null | undefined) ?? null,
      paused: Boolean(data.paused),
      lastQr: (data.lastQr as string | null | undefined) ?? null,
      headless:
        typeof data.headless === 'boolean' ? data.headless : env.wppHeadless,
    },
    update: data,
  });
}

export async function startSession(ownerUserId: number, io?: SocketIOServer) {
  if (sessions.has(ownerUserId)) {
    return sessions.get(ownerUserId);
  }

  await upsertBotSession(ownerUserId, {
    status: 'CONNECTING',
    connectedAt: null,
  });

  const options: CreateOptions = {
    session: `user-${ownerUserId}`,
    headless: env.wppHeadless,
    autoClose: env.wppAutoCloseMs,
    catchQR: (qrCode: string, asciiQR: string) => {
      const cached = sessions.get(ownerUserId);
      if (cached) {
        cached.lastQr = qrCode;
        cached.lastQrAscii = asciiQR;
        sessions.set(ownerUserId, cached);
      }
      emitToRoom(io, `user:${ownerUserId}`, 'session:qr', {
        qr: qrCode,
        ascii: asciiQR,
      });
      void upsertBotSession(ownerUserId, { lastQr: qrCode });
    },
    statusFind: (status: string) => {
      const statusMap: Record<string, BotSessionStatus> = {
        isLogged: 'CONNECTED',
        desconnectedMobile: 'DISCONNECTED',
        qrReadSuccess: 'CONNECTING',
        desconnected: 'DISCONNECTED',
      };
      const normalized =
        statusMap[status] ??
        (status.toLowerCase().includes('error') ? 'ERROR' : 'CONNECTING');

      const cached = sessions.get(ownerUserId);
      if (cached) {
        cached.status = normalized;
        cached.connectedAt =
          normalized === 'CONNECTED' ? new Date() : cached.connectedAt;
        sessions.set(ownerUserId, cached);
      }

      emitToRoom(io, `user:${ownerUserId}`, 'session:status', normalized);
      void upsertBotSession(ownerUserId, {
        status: normalized,
        connectedAt: normalized === 'CONNECTED' ? new Date() : null,
      });
    },
    onLoadingScreen: (percent: number, message: string) => {
      emitToRoom(io, `user:${ownerUserId}`, 'session:loading', {
        percent,
        message,
      });
    },
  };

  const client = await createClient(options);
  const cache: SessionCache = {
    client,
    status: 'CONNECTED',
    lastQr: null,
    lastQrAscii: null,
    connectedAt: new Date(),
    paused: false,
  };
  sessions.set(ownerUserId, cache);

  attachMessageHandlers(ownerUserId, client, io);

  emitToRoom(io, `user:${ownerUserId}`, 'session:status', 'CONNECTED');
  await upsertBotSession(ownerUserId, {
    status: 'CONNECTED',
    connectedAt: new Date(),
    lastQr: null,
  });

  return cache;
}

/**
 * Crea una orden cuando se completa un flujo (llega al nodo END)
 */
async function createOrderFromCompletedFlow(
  conversationId: number,
  context: any,
  contact: any,
  conversation: any
): Promise<void> {
  try {
    // Verificar si ya existe una orden para esta conversación
    const existingOrder = await (prisma as any).order.findUnique({
      where: { conversationId: BigInt(conversationId) },
    });

    if (existingOrder) {
      console.log(
        `[ORDER] Ya existe orden para conversación ${conversationId}, omitiendo creación`
      );
      return;
    }

    // Extraer datos del contexto y variables capturadas
    const clientPhone = conversation.userPhone || '';
    const clientName =
      contact?.name || conversation.contactName || context.GLOBAL_nombre || '';

    // Determinar el tipo de conversación basado en las variables del contexto
    let tipoConversacion = 'General';
    if (context.menu_selected) {
      const menuOption = context.menu_selected.toLowerCase();
      if (menuOption.includes('pedido')) {
        tipoConversacion = 'Pedido';
      } else if (menuOption.includes('precio')) {
        tipoConversacion = 'Consulta Precio';
      } else if (menuOption.includes('estado')) {
        tipoConversacion = 'Estado Pedido';
      } else if (menuOption.includes('ofertas')) {
        tipoConversacion = 'Ofertas';
      } else if (menuOption.includes('asesor')) {
        tipoConversacion = 'Asesor';
      }
    }

    // Recopilar todas las variables del contexto como datos del pedido
    const contextVariables = { ...context };
    delete contextVariables.lastMessage;
    delete contextVariables.previousNode;
    delete contextVariables.updatedAt;
    delete contextVariables.waitingForInput;
    delete contextVariables.waitingVariable;

    // Crear la orden
    const newOrder = await (prisma as any).order.create({
      data: {
        conversationId: BigInt(conversationId),
        clientPhone,
        clientName: clientName || 'Cliente',
        tipoConversacion,
        itemsJson: JSON.stringify(contextVariables),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        conversation: {
          select: {
            userPhone: true,
            contactName: true,
          },
        },
      },
    });

    console.log(`[ORDER] Nueva orden creada:`, {
      orderId: newOrder.id,
      conversationId,
      clientPhone,
      clientName,
      tipoConversacion,
    });

    // Emitir evento de socket para notificar al frontend
    const io = (global as any).io;
    if (io) {
      io.emit('order:created', sanitizeBigInts(newOrder));
      console.log(`[ORDER] Evento socket emitido: order:created`);
    }
  } catch (error) {
    console.error(
      `[ORDER] Error creando orden para conversación ${conversationId}:`,
      error
    );
    throw error;
  }
}

export async function stopSession(ownerUserId: number) {
  const cache = sessions.get(ownerUserId);
  if (!cache) return;

  await cache.client.close();
  sessions.delete(ownerUserId);
  await upsertBotSession(ownerUserId, {
    status: 'DISCONNECTED',
    connectedAt: null,
  });
}

export async function pauseSession(ownerUserId: number, paused: boolean) {
  const cache = sessions.get(ownerUserId);
  if (cache) {
    cache.paused = paused;
    sessions.set(ownerUserId, cache);
  }

  await upsertBotSession(ownerUserId, { paused });
}

export function getSessionInfo(ownerUserId: number) {
  return sessions.get(ownerUserId) ?? null;
}

export async function getOrCreateBotSessionRecord(ownerUserId: number) {
  return prisma.botSession.upsert({
    where: {
      ownerUserId_sessionName: {
        ownerUserId,
        sessionName: 'default',
      },
    },
    create: {
      ownerUserId,
      sessionName: 'default',
      status: 'DISCONNECTED',
    },
    update: {},
  });
}

export function getActiveSessionOwnerIds() {
  return Array.from(sessions.keys());
}

export async function sendTextFromSession(
  ownerUserId: number,
  chatId: string,
  content: string
): Promise<Message | null> {
  const cache = sessions.get(ownerUserId);
  if (!cache) {
    return null;
  }

  try {
    const rawMessage = await cache.client.sendText(chatId, content);
    return rawMessage && typeof rawMessage === 'object'
      ? (rawMessage as Message)
      : null;
  } catch (error) {
    console.error(
      '[WPP] Failed to send message from session',
      ownerUserId,
      error
    );
    return null;
  }
}

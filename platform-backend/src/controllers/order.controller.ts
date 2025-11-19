import { Request, Response } from 'express';
import type { Prisma, OrderStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { closeConversationRecord } from '../services/conversation.service';
import { broadcastConversationUpdate } from '../services/wpp.service';

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
  if (obj instanceof Date) {
    return obj.toISOString();
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

/**
 * Enviar mensaje WhatsApp al cliente
 * Nota: Esta función necesita ser implementada según tu arquitectura WPP
 */
async function sendWhatsAppMessage(phone: string, message: string) {
  try {
    // TODO: Implementar según tu servicio WPP
    // Por ahora solo hacemos log
    console.log(`📱 WhatsApp a ${phone}: ${message}`);

    // Ejemplo de cómo podrías implementarlo:
    // const response = await wppClient.sendMessage(phone, { text: message });
    // return response;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

async function closeConversationForOrder(
  conversationIdRaw: unknown,
  reason: string
) {
  if (conversationIdRaw === null || conversationIdRaw === undefined) {
    return;
  }

  let conversationId: bigint | null = null;
  if (typeof conversationIdRaw === 'bigint') {
    conversationId = conversationIdRaw;
  } else if (typeof conversationIdRaw === 'number') {
    if (!Number.isNaN(conversationIdRaw)) {
      conversationId = BigInt(conversationIdRaw);
    }
  } else if (typeof conversationIdRaw === 'string') {
    const trimmed = conversationIdRaw.trim();
    if (trimmed.length > 0) {
      try {
        conversationId = BigInt(trimmed);
      } catch {
        conversationId = null;
      }
    }
  }

  if (!conversationId) {
    return;
  }

  try {
    await closeConversationRecord(conversationId, {
      closedById: null,
      reason,
    });
    const io = (global as any).io;
    await broadcastConversationUpdate(io, conversationId);
  } catch (error) {
    console.error(
      '[ORDERS] Error closing conversation linked to order:',
      error
    );
  }
}

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Listar todos los pedidos
 *     tags:
 *       - Pedidos
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMADO, COMPLETADO, CANCELADO]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *           default: 0
 *     responses:
 *       200:
 *         description: Lista de pedidos
 */
export const getOrdersHandler = async (req: Request, res: Response) => {
  try {
    const {
      status,
      search,
      limit = '50',
      offset = '0',
      startDate,
      endDate,
      operatorId,
      operatorName,
      clientPhone,
      conversationId,
    } = req.query;

    const where: Prisma.OrderWhereInput = {};
    const andFilters: Prisma.OrderWhereInput[] = [];

    const validStatuses: ReadonlyArray<OrderStatus> = [
      'PENDING',
      'CONFIRMADO',
      'COMPLETADO',
      'CANCELADO',
    ];

    const statusValue =
      typeof status === 'string' ? status.toUpperCase() : undefined;

    if (statusValue && validStatuses.includes(statusValue as OrderStatus)) {
      where.status = statusValue as OrderStatus;
    }

    const trimmedSearch = typeof search === 'string' ? search.trim() : '';
    if (trimmedSearch.length) {
      const orConditions: Prisma.OrderWhereInput[] = [
        {
          clientName: {
            contains: trimmedSearch,
          },
        },
        { clientPhone: { contains: trimmedSearch } },
        {
          tipoConversacion: {
            contains: trimmedSearch,
          },
        },
        {
          concept: {
            contains: trimmedSearch,
          },
        },
        {
          requestDetails: {
            contains: trimmedSearch,
          },
        },
        {
          customerData: {
            contains: trimmedSearch,
          },
        },
        {
          paymentMethod: {
            contains: trimmedSearch,
          },
        },
        {
          conversation: {
            is: {
              userPhone: {
                contains: trimmedSearch,
              },
            },
          },
        },
        { itemsJson: { contains: trimmedSearch } },
      ];
      const searchAsNumber = Number(trimmedSearch);
      if (!Number.isNaN(searchAsNumber)) {
        orConditions.push({ id: searchAsNumber });
      }
      andFilters.push({ OR: orConditions });
    }

    if (clientPhone && typeof clientPhone === 'string') {
      andFilters.push({
        clientPhone: {
          contains: clientPhone,
        },
      });
    }

    if (startDate || endDate) {
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (startDate && typeof startDate === 'string') {
        const parsed = new Date(startDate);
        if (!Number.isNaN(parsed.getTime())) {
          createdAtFilter.gte = parsed;
        }
      }
      if (endDate && typeof endDate === 'string') {
        const parsed = new Date(endDate);
        if (!Number.isNaN(parsed.getTime())) {
          createdAtFilter.lte = parsed;
        }
      }
      if (Object.keys(createdAtFilter).length > 0) {
        andFilters.push({ createdAt: createdAtFilter });
      }
    }

    if (operatorId && typeof operatorId === 'string') {
      const parsedOperatorId = parseInt(operatorId, 10);
      if (!Number.isNaN(parsedOperatorId)) {
        andFilters.push({
          conversation: {
            is: {
              assignedToId: parsedOperatorId,
            },
          },
        });
      }
    }

    if (operatorName && typeof operatorName === 'string') {
      andFilters.push({
        conversation: {
          is: {
            assignedTo: {
              is: {
                name: {
                  contains: operatorName,
                },
              },
            },
          },
        },
      });
    }

    if (conversationId && typeof conversationId === 'string') {
      try {
        const parsedConversationId = BigInt(conversationId);
        andFilters.push({
          conversationId: parsedConversationId,
        });
      } catch {
        // Ignorar conversaci��n inv��lida
      }
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const limitParam =
      typeof limit === 'string' ? limit.trim().toLowerCase() : '50';
    let finalLimit: number | undefined;
    if (limitParam === 'all') {
      finalLimit = undefined;
    } else {
      const parsed = parseInt(limitParam, 10);
      finalLimit = Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
    }

    const orderQuery: Prisma.OrderFindManyArgs = {
      where,
      include: {
        conversation: {
          select: {
            userPhone: true,
            contactName: true,
            assignedToId: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
              },
            },
            contact: {
              select: {
                id: true,
                name: true,
                dni: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(offset as string, 10),
    };

    if (typeof finalLimit === 'number') {
      orderQuery.take = finalLimit;
    }

    const orders = await (prisma as any).order.findMany(orderQuery);

    const total = await (prisma as any).order.count({ where });

    // Convertir BigInts para evitar errores de serialización
    const sanitizedOrders = sanitizeBigInts(orders);

    return res.status(200).json({
      orders: sanitizedOrders,
      total,
      limit: typeof finalLimit === 'number' ? finalLimit : null,
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Obtener detalles de un pedido
 *     tags:
 *       - Pedidos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Detalles del pedido
 *       404:
 *         description: Pedido no encontrado
 */
export const getOrderHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await (prisma as any).order.findUnique({
      where: { id: parseInt(id) },
      include: {
        conversation: {
          select: {
            userPhone: true,
            contactName: true,
            context: true,
            lastActivity: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.status(200).json(sanitizeBigInts(order));
  } catch (error) {
    console.error('Error fetching order:', error);
    return res.status(500).json({ error: 'Failed to fetch order' });
  }
};

/**
 * @swagger
 * /orders/{id}/complete:
 *   patch:
 *     summary: Completar un pedido
 *     tags:
 *       - Pedidos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [COMPLETADO, CANCELADO_CLIENTE, ARREPENTIDO, INACTIVIDAD]
 *               mensaje:
 *                 type: string
 *                 description: Mensaje personalizado a enviar al cliente
 *     responses:
 *       200:
 *         description: Pedido actualizado
 *       400:
 *         description: Bad request
 *       404:
 *         description: Pedido no encontrado
 */
export const completeOrderHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, mensaje } = req.body;

    // Validar que reason sea válido
    const validReasons = [
      'COMPLETADO',
      'CANCELADO_CLIENTE',
      'ARREPENTIDO',
      'INACTIVIDAD',
    ];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason' });
    }

    // Obtener pedido
    const order = await (prisma as any).order.findUnique({
      where: { id: parseInt(id) },
      include: {
        conversation: {
          select: {
            userPhone: true,
            contactName: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'PENDING' && order.status !== 'CONFIRMADO') {
      return res
        .status(400)
        .json({ error: 'Order cannot be closed from current status' });
    }

    // Determinar nuevo estado
    const newStatus = reason === 'COMPLETADO' ? 'COMPLETADO' : 'CANCELADO';

    // Actualizar pedido
    const updatedOrder = await (prisma as any).order.update({
      where: { id: parseInt(id) },
      data: {
        status: newStatus,
        closeReason: reason,
        closedAt: new Date(),
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

    // Enviar mensaje WhatsApp si está completado
    if (reason === 'COMPLETADO') {
      try {
        const messageText = mensaje || `✅ Tu pedido ha sido completado`;
        await sendWhatsAppMessage(order.conversation.userPhone, messageText);

        console.log(`📱 Mensaje enviado a ${order.conversation.userPhone}`);
      } catch (wppError) {
        console.error('Error sending WhatsApp message:', wppError);
        // No fallar si no se puede enviar el mensaje
      }
    }

    await closeConversationForOrder(
      order.conversationId ?? updatedOrder.conversationId,
      newStatus === 'COMPLETADO'
        ? 'order_completed'
        : `order_cancelled:${reason}`
    );

    // Emitir socket event
    const io = (global as any).io;
    if (io) {
      io.emit('order:updated', sanitizeBigInts(updatedOrder));
      io.emit('order:completed', {
        orderId: updatedOrder.id,
        clientPhone: updatedOrder.conversation.userPhone,
        closedAt: updatedOrder.closedAt,
        reason: updatedOrder.closeReason,
      });
    }

    return res.status(200).json({
      success: true,
      order: sanitizeBigInts(updatedOrder),
      message: `Pedido marcado como ${reason}`,
    });
  } catch (error) {
    console.error('Error completing order:', error);
    return res.status(500).json({ error: 'Failed to complete order' });
  }
};

/**
 * @swagger
 * /orders/{id}:
 *   patch:
 *     summary: Actualizar notas de un pedido
 *     tags:
 *       - Pedidos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notas:
 *                 type: string
 *               especificaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pedido actualizado
 *       404:
 *         description: Pedido no encontrado
 */
export const updateOrderHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notas, especificaciones } = req.body;

    const updatedOrder = await (prisma as any).order.update({
      where: { id: parseInt(id) },
      data: {
        ...(notas !== undefined && { notas }),
        ...(especificaciones !== undefined && { especificaciones }),
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

    // Emitir socket event
    const io = (global as any).io;
    if (io) {
      io.emit('order:updated', sanitizeBigInts(updatedOrder));
    }

    return res.status(200).json(sanitizeBigInts(updatedOrder));
  } catch (error) {
    console.error('Error updating order:', error);
    return res.status(500).json({ error: 'Failed to update order' });
  }
};

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Cancelar un pedido
 *     tags:
 *       - Pedidos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Pedido cancelado
 *       404:
 *         description: Pedido no encontrado
 */
export const deleteOrderHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await (prisma as any).order.findUnique({
      where: { id: parseInt(id) },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const deletedOrder = await (prisma as any).order.delete({
      where: { id: parseInt(id) },
    });

    // Emitir socket event
    const io = (global as any).io;
    if (io) {
      io.emit('order:deleted', { orderId: deletedOrder.id });
    }

    return res.status(200).json({ success: true, message: 'Order deleted' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return res.status(500).json({ error: 'Failed to delete order' });
  }
};

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Actualizar solo el estado de un pedido
 *     tags:
 *       - Pedidos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMADO, COMPLETADO, CANCELADO]
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *       404:
 *         description: Pedido no encontrado
 */
export const updateOrderStatusHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['PENDING', 'CONFIRMADO', 'COMPLETADO', 'CANCELADO'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error:
          'Invalid status. Must be one of: PENDING, CONFIRMADO, COMPLETADO, CANCELADO',
      });
    }

    const existingOrder = await (prisma as any).order.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    // Si el estado cambia a COMPLETADO o CANCELADO, establecer closedAt
    if (
      (status === 'COMPLETADO' || status === 'CANCELADO') &&
      !existingOrder.closedAt
    ) {
      updateData.closedAt = new Date();
    }

    const updatedOrder = await (prisma as any).order.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    if (status === 'COMPLETADO' || status === 'CANCELADO') {
      await closeConversationForOrder(
        updatedOrder.conversationId,
        status === 'COMPLETADO' ? 'order_completed' : 'order_cancelled:status'
      );
    }

    const sanitizedOrder = sanitizeBigInts(updatedOrder);

    // Emitir socket event para actualización en tiempo real
    const io = (global as any).io;
    if (io) {
      io.emit('order:updated', sanitizedOrder);
    }

    return res.status(200).json({
      message: 'Order status updated successfully',
      order: sanitizedOrder,
      status: sanitizedOrder.status,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
};




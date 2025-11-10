/**
 * @copyright Copyright (c) 2025 zerofarias
 * @author zerofarias
 * @file Controller para manejar datos capturados por nodos DATA_LOG en flujos
 */
import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export async function saveFlowData(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { botId, conversationId, dataType, variables, phoneNumber } =
      req.body;

    // Validar campos requeridos
    if (!botId || !conversationId || !dataType || !variables) {
      return res.status(400).json({
        message:
          'Missing required fields: botId, conversationId, dataType, variables',
      });
    }

    // Validar que dataType sea uno de los permitidos
    const validDataTypes = [
      'pedido',
      'consulta_precio',
      'consulta_general',
      'otro',
    ];
    if (!validDataTypes.includes(dataType)) {
      return res.status(400).json({
        message: `Invalid dataType. Must be one of: ${validDataTypes.join(
          ', '
        )}`,
      });
    }

    // Serializar variables a JSON si es un objeto
    const variablesJson =
      typeof variables === 'string' ? variables : JSON.stringify(variables);

    // Guardar en la base de datos
    const flowData = await prisma.flowData.create({
      data: {
        botId,
        conversationId: BigInt(conversationId),
        dataType,
        variables: variablesJson,
        phoneNumber: phoneNumber || null,
      },
    });

    console.log('[saveFlowData] Data saved successfully:', {
      id: flowData.id,
      botId,
      conversationId,
      dataType,
      phoneNumber,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: flowData.id,
        createdAt: flowData.createdAt,
      },
    });
  } catch (error) {
    console.error('[saveFlowData] Error saving flow data:', error);
    return res.status(500).json({
      message: 'Failed to save flow data',
      error: String(error),
    });
  }
}

export async function getFlowDataByType(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { botId, dataType, limit = 100, offset = 0 } = req.query;

    if (!botId) {
      return res.status(400).json({ message: 'botId is required' });
    }

    const query: any = {
      botId: Number(botId),
    };

    if (dataType) {
      query.dataType = String(dataType);
    }

    const flowDataRecords = await prisma.flowData.findMany({
      where: query,
      orderBy: {
        createdAt: 'desc',
      },
      take: Number(limit),
      skip: Number(offset),
    });

    // Parsear variables JSON para cada registro
    const parsedRecords = flowDataRecords.map((record) => {
      try {
        return {
          ...record,
          variables: JSON.parse(record.variables),
        };
      } catch {
        return {
          ...record,
          variables: {},
        };
      }
    });

    // Obtener total de registros
    const total = await prisma.flowData.count({
      where: query,
    });

    return res.status(200).json({
      data: parsedRecords,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    console.error('[getFlowDataByType] Error fetching flow data:', error);
    return res.status(500).json({
      message: 'Failed to fetch flow data',
      error: String(error),
    });
  }
}

export async function deleteFlowData(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'id is required' });
    }

    const deleted = await prisma.flowData.delete({
      where: { id: Number(id) },
    });

    console.log('[deleteFlowData] Data deleted:', deleted.id);

    return res.status(200).json({
      success: true,
      message: 'Flow data deleted successfully',
    });
  } catch (error) {
    console.error('[deleteFlowData] Error deleting flow data:', error);
    return res.status(500).json({
      message: 'Failed to delete flow data',
      error: String(error),
    });
  }
}

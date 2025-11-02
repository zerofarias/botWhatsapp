// Actualizar flujo clásico (PUT /api/classic-flow/:flowId)
export async function updateClassicFlow(req: Request, res: Response) {
  try {
    const flowId = Number(req.params.flowId);
    const steps = req.body;
    // Elimina los pasos existentes del flujo
    await prisma.flow_classic.deleteMany({ where: { flow_id: flowId } });
    // Guarda los nuevos pasos
    async function saveStep(step: any, parentId: number | null, order: number) {
      const dbStep = await prisma.flow_classic.create({
        data: {
          flow_id: flowId,
          parent_id: parentId,
          type: step.type,
          label: step.label,
          value: step.value,
          seconds: step.seconds,
          trigger_keyword: step.type === 'trigger' ? step.value : null,
          order_in_parent: order,
        },
      });
      if (step.children && step.children.length > 0) {
        for (let i = 0; i < step.children.length; i++) {
          await saveStep(step.children[i], Number(dbStep.id), i);
        }
      }
      return dbStep.id;
    }
    for (let i = 0; i < steps.length; i++) {
      await saveStep(steps[i], null, i);
    }
    res.status(200).json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(500).json({ error: String(err) });
    }
  }
}
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Guardar flujo clásico (POST /api/classic-flow)
export async function createClassicFlow(req: Request, res: Response) {
  try {
    const { flowId, steps } = req.body;
    // Guardar recursivamente los pasos
    async function saveStep(step: any, parentId: number | null, order: number) {
      const dbStep = await prisma.flow_classic.create({
        data: {
          flow_id: flowId,
          parent_id: parentId,
          type: step.type,
          label: step.label,
          value: step.value,
          seconds: step.seconds,
          trigger_keyword: step.type === 'trigger' ? step.value : null,
          order_in_parent: order,
        },
      });
      // Guardar hijos
      if (step.children && step.children.length > 0) {
        for (let i = 0; i < step.children.length; i++) {
          await saveStep(step.children[i], Number(dbStep.id), i);
        }
      }
      return dbStep.id;
    }
    // Guardar todos los pasos raíz
    for (let i = 0; i < steps.length; i++) {
      await saveStep(steps[i], null, i);
    }
    res.status(201).json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(500).json({ error: String(err) });
    }
  }
}

// Obtener flujo clásico (GET /api/classic-flow/:flowId)
export async function getClassicFlow(req: Request, res: Response) {
  try {
    const flowId = Number(req.params.flowId);
    const allSteps = await prisma.flow_classic.findMany({
      where: { flow_id: flowId },
      orderBy: [{ parent_id: 'asc' }, { order_in_parent: 'asc' }],
    });
    // Convertir BigInt a number en todos los pasos
    const steps = allSteps.map((s) => {
      const safeStep: Record<string, any> = {};
      for (const key in s) {
        const value = (s as any)[key];
        if (typeof value === 'bigint') {
          safeStep[key] = Number(value);
        } else {
          safeStep[key] = value;
        }
      }
      return safeStep;
    });
    res.json(steps); // El frontend espera un array plano, no árbol
  } catch (err: unknown) {
    if (err instanceof Error) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(500).json({ error: String(err) });
    }
  }
}

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getFlowGraph, saveFlowGraph } from '../controllers/flow.controller.js';

export const flowRouter = Router();

flowRouter.use(authenticate);
flowRouter.get('/graph', getFlowGraph);
flowRouter.post('/save-graph', saveFlowGraph);

// Proxy para probar peticiones HTTP desde el Flow Builder (evita CORS)
flowRouter.post('/http-proxy', async (req: Request, res: Response) => {
  try {
    const { method, url, headers, body } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL es requerida' });
    }

    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: headers || {},
    };

    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    console.log(`[HTTP-PROXY] ${method} ${url}`);

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    
    let data: unknown;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return res.status(response.status).json({
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      data,
    });
  } catch (error) {
    console.error('[HTTP-PROXY] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Error en la petición',
    });
  }
});

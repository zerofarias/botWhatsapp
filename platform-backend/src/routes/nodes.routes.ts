/**
 * @copyright Copyright (c) 2025 zerofarias
 * @author zerofarias
 * @file Rutas para nodos de flujos conversacionales
 */
import { Router } from 'express';
import { listNodes, createNode } from '../controllers/nodes.controller.js';

const nodesRouter = Router();

nodesRouter.get('/flows/:flowId/nodes', listNodes);
nodesRouter.post('/flows/:flowId/nodes', createNode);
// Puedes agregar PUT y DELETE aquí

export default nodesRouter;

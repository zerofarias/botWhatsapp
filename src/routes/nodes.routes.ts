import express from 'express';
import { listNodes, createNode } from '../controllers/nodes.controller';
const router = express.Router();

router.get('/flows/:flowId/nodes', listNodes);
router.post('/flows/:flowId/nodes', createNode);
// Puedes agregar PUT y DELETE aquí

export default router;

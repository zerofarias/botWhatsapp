import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getAdminAnalyticsSummary } from '../controllers/analytics.controller';

const analyticsRouter = Router();

analyticsRouter.use(authenticate);
analyticsRouter.get('/summary', getAdminAnalyticsSummary);

export default analyticsRouter;

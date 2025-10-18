import { Router } from 'express';
import { authRouter } from './auth.js';
import { flowRouter } from './flows.js';
import { botRouter } from './bot.js';
import { messageRouter } from './messages.js';
import { userRouter } from './users.js';
import { areaRouter } from './areas.js';
import { conversationRouter } from './conversations.js';
import { contactRouter } from './contacts.js';
import { workingHourRouter } from './working-hours.js';
import { quickRepliesRouter } from './quick-replies.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/flows', flowRouter);
apiRouter.use('/bot', botRouter);
apiRouter.use('/messages', messageRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/areas', areaRouter);
apiRouter.use('/conversations', conversationRouter);
apiRouter.use('/contacts', contactRouter);
apiRouter.use('/working-hours', workingHourRouter);
apiRouter.use('/quick-replies', quickRepliesRouter);

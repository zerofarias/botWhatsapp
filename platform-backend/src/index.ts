import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';

import { createApp, initializeSocketServer } from './app.js';
import { startConversationScheduler } from './bot/scheduler.js';
import { env } from './config/env.js';
import { connectPrisma, prisma } from './config/prisma.js';
import { createHybridServer, httpsRedirectMiddleware } from './config/ssl.js';
import { startSession } from './services/wpp.service.js';

async function bootstrap() {
  await connectPrisma();
  const { app, sessionMiddleware, corsOrigin } = createApp();

  if (env.enableSsl) {
    app.use(httpsRedirectMiddleware);
  }

  const { server, protocol } = createHybridServer(app);
  const io = initializeSocketServer(server, sessionMiddleware, corsOrigin);
  const port = env.enableSsl ? 443 : env.port;

  if (env.enableSsl) {
    const httpApp = express();
    httpApp.use(httpsRedirectMiddleware);
    httpApp.listen(80, () => {
      console.log('HTTP redirect server ready on port 80');
    });

    server.listen(port, () => {
      console.log(`HTTPS API ready on ${protocol}://${env.domainName}:${port}`);
      autoStartBotSessions(io);
      startConversationScheduler(io);
    });
  } else {
    server.listen(port, '0.0.0.0', () => {
      console.log(`HTTP API ready on ${protocol}://0.0.0.0:${port}`);
      console.log(`   Access locally: http://localhost:${port}`);
      autoStartBotSessions(io);
      startConversationScheduler(io);
    });
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});

async function autoStartBotSessions(
  io: ReturnType<typeof initializeSocketServer>
) {
  try {
    const autoSessions = await prisma.botSession.findMany({
      where: { autoStart: true },
      select: { ownerUserId: true },
    });

    for (const session of autoSessions) {
      try {
        const tokenPath = path.join(
          process.cwd(),
          'tokens',
          `user-${session.ownerUserId}`
        );
        if (!fs.existsSync(tokenPath)) {
          console.warn(
            `[AutoStart] Skipping user ${session.ownerUserId} - token path does not exist: ${tokenPath}`
          );
          continue;
        }
        await startSession(session.ownerUserId, io);
      } catch (error) {
        console.error(
          `[AutoStart] Failed to start session for user ${session.ownerUserId}`,
          error
        );
      }
    }
  } catch (error) {
    console.error('[AutoStart] Failed to load auto-start sessions', error);
  }
}

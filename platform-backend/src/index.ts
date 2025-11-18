import 'dotenv/config';
import { createApp, initializeSocketServer } from './app.js';
import { env } from './config/env.js';
import { connectPrisma, prisma } from './config/prisma.js';
import { createHybridServer, httpsRedirectMiddleware } from './config/ssl.js';
import express from 'express';
import { startSession } from './services/wpp.service.js';

async function bootstrap() {
  await connectPrisma();
  const { app, sessionMiddleware, corsOrigin } = createApp();

  // Agregar middleware de redirección HTTPS si SSL está habilitado
  if (env.enableSsl) {
    app.use(httpsRedirectMiddleware);
  }

  // Crear servidor con soporte SSL opcional
  const { server, protocol } = createHybridServer(app);
  const io = initializeSocketServer(server, sessionMiddleware, corsOrigin);
  await autoStartBotSessions(io);

  const port = env.enableSsl ? 443 : env.port;
  const httpPort = env.enableSsl ? 80 : env.port;

  if (env.enableSsl) {
    // En modo SSL, crear servidor HTTP para redirecciones en puerto 80
    const httpApp = express();
    httpApp.use(httpsRedirectMiddleware);
    httpApp.listen(80, () => {
      console.log(`🔀 HTTP redirect server ready on port 80`);
    });

    // Servidor HTTPS en puerto 443
    server.listen(port, () => {
      console.log(
        `🔐 HTTPS API ready on ${protocol}://${env.domainName}:${port}`
      );
    });
  } else {
    // Modo HTTP normal
    server.listen(port, () => {
      console.log(`🌐 HTTP API ready on ${protocol}://localhost:${port}`);
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

import 'dotenv/config';
import { createApp, initializeSocketServer } from './app.js';
import { env } from './config/env.js';
import { connectPrisma } from './config/prisma.js';
import { createHybridServer, httpsRedirectMiddleware } from './config/ssl.js';
import express from 'express';

async function bootstrap() {
  await connectPrisma();
  const { app, sessionMiddleware, corsOrigin } = createApp();

  // Agregar middleware de redirección HTTPS si SSL está habilitado
  if (env.enableSsl) {
    app.use(httpsRedirectMiddleware);
  }

  // Crear servidor con soporte SSL opcional
  const { server, protocol } = createHybridServer(app);
  initializeSocketServer(server, sessionMiddleware, corsOrigin);

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

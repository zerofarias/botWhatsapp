import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectPrisma } from './config/prisma.js';

async function bootstrap() {
  await connectPrisma();
  const { server } = createApp();

  server.listen(env.port, () => {
    console.log(`API ready on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});

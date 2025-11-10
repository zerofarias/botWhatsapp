import './env.js';
import { PrismaClient } from '@prisma/client';
import {
  getPendingTaskCount,
  getPendingTaskSummary,
  waitForTrackedTasks,
} from '../utils/shutdown-manager.js';

const SHUTDOWN_DRAIN_TIMEOUT_MS = Number(
  process.env.SHUTDOWN_DRAIN_TIMEOUT_MS ?? '5000'
);

export const prisma = new PrismaClient({
  log: [
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});

export async function connectPrisma() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('[Prisma] Connected to MySQL successfully');
  } catch (error) {
    console.error('[Prisma] Connection failed:', error);
    process.exit(1);
  }
}

prisma.$on('error', (error) => {
  console.error('[Prisma Error] Connection lost:', error);
});

let shuttingDown = false;
async function gracefulShutdown(signal: NodeJS.Signals) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  const pendingCount = getPendingTaskCount();
  if (pendingCount > 0) {
    console.log(
      `[Prisma] Waiting up to ${SHUTDOWN_DRAIN_TIMEOUT_MS}ms for ${pendingCount} pending task(s) before shutdown...`
    );
    const summary = getPendingTaskSummary();
    summary.forEach((task) => {
      console.log(
        `[Prisma] Pending task #${task.id} (${task.label}) running for ${task.durationMs}ms`
      );
    });
    await waitForTrackedTasks(SHUTDOWN_DRAIN_TIMEOUT_MS);
  }

  console.log('[Prisma] Shutting down gracefully...');
  try {
    await prisma.$disconnect();
  } catch (disconnectError) {
    console.error('[Prisma] Error during disconnect:', disconnectError);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

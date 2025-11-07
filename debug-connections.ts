import { prisma } from './platform-backend/src/config/prisma.js';

async function debugConnections() {
  try {
    const connections = await prisma.flowConnection.findMany({
      select: {
        id: true,
        fromId: true,
        toId: true,
        trigger: true,
        from: { select: { name: true } },
        to: { select: { name: true } },
      },
      orderBy: { id: 'asc' },
    });

    console.log('=== FLOW CONNECTIONS ===');
    connections.forEach((conn) => {
      console.log(
        `ID: ${conn.id}, From: ${conn.fromId} (${conn.from?.name}), To: ${conn.toId} (${conn.to?.name}), Trigger: ${conn.trigger}`
      );
    });

    console.log('\n=== FLOW NODES ===');
    const flows = await prisma.flow.findMany({
      select: { id: true, name: true, type: true, botId: true },
      orderBy: { id: 'asc' },
    });
    flows.forEach((flow) => {
      console.log(
        `ID: ${flow.id}, Name: ${flow.name}, Type: ${flow.type}, BotID: ${flow.botId}`
      );
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugConnections();

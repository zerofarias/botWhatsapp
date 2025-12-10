import { prisma } from './src/config/prisma.js';

async function debugData() {
  console.log('🔍 Analizando datos del dashboard...\n');

  // 1. Recordatorios
  console.log('=== RECORDATORIOS ===\n');
  const allReminders = await prisma.contactReminder.findMany({
    include: {
      contact: {
        select: { id: true, name: true, phone: true },
      },
    },
    orderBy: { remindAt: 'asc' },
  });

  console.log(`Total de recordatorios: ${allReminders.length}\n`);
  allReminders.forEach((r, i) => {
    console.log(`${i + 1}. ${r.title} - ${r.remindAt.toLocaleDateString('es-AR')} (recurrencia: cada ${r.repeatIntervalDays || 'nunca'} días)`);
  });

  // 2. Conversaciones por estado
  console.log('\n=== CONVERSACIONES ===\n');
  
  const activeConversations = await prisma.conversation.findMany({
    where: {
      status: { in: ['PENDING', 'ACTIVE', 'PAUSED'] },
    },
    select: {
      id: true,
      status: true,
      area: { select: { name: true } },
      contact: { select: { name: true } },
    },
  });

  const closedConversations = await prisma.conversation.findMany({
    where: { status: 'CLOSED' },
    select: {
      id: true,
      status: true,
      area: { select: { name: true } },
      contact: { select: { name: true } },
    },
  });

  console.log(`Conversaciones ACTIVAS (PENDING, ACTIVE, PAUSED): ${activeConversations.length}`);
  console.log(`Conversaciones CERRADAS: ${closedConversations.length}`);
  console.log(`TOTAL: ${activeConversations.length + closedConversations.length}\n`);

  // 3. Breakdown por área (solo activas)
  console.log('=== BREAKDOWN POR ÁREA (Conversaciones Activas) ===\n');
  const areaCounter = new Map<string, number>();
  activeConversations.forEach((conv) => {
    const key = conv.area?.name ?? 'Sin área';
    areaCounter.set(key, (areaCounter.get(key) ?? 0) + 1);
  });

  const breakdown = Array.from(areaCounter.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  breakdown.forEach((item) => {
    console.log(`${item.name}: ${item.count}`);
  });

  // 4. Breakdown por estado
  console.log('\n=== BREAKDOWN POR ESTADO ===\n');
  const statusCounter = new Map<string, number>();
  
  [...activeConversations, ...closedConversations].forEach((conv) => {
    statusCounter.set(conv.status, (statusCounter.get(conv.status) ?? 0) + 1);
  });

  Array.from(statusCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`${status}: ${count}`);
    });

  process.exit(0);
}

debugData().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});


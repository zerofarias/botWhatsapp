import { listDueReminders } from '../services/contactReminder.service.js';
import { prisma } from '../config/prisma.js';

async function run() {
  try {
    const today = new Date();
    const reminders = await listDueReminders(today);
    if (!reminders.length) {
      console.log('[Reminders] No hay recordatorios para hoy.');
      return;
    }

    console.log(
      `[Reminders] Recordatorios para ${today.toLocaleDateString('es-AR')}:`
    );
    reminders.forEach((reminder) => {
      console.log(
        ` - ${reminder.title} (${reminder.contact?.name ?? 'Contacto'}) a las ${new Date(
          reminder.remindAt
        ).toLocaleTimeString('es-AR')} ${
          reminder.repeatIntervalDays
            ? `[Repite cada ${reminder.repeatIntervalDays} días]`
            : ''
        }`
      );
    });
  } finally {
    await prisma.$disconnect();
  }
}

void run();

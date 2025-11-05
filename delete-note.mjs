import { prisma } from './platform-backend/dist/config/prisma.js';

async function deleteCorruptedNote() {
  try {
    // Buscar la nota con el base64 de JPEG en ConversationEvent
    const eventsToDelete = await prisma.conversationEvent.findMany({
      where: {
        eventType: 'NOTE',
        payload: {
          contains: '/9j/4AAQSkZJRgABAQAAAQABAAD',
        },
      },
    });

    console.log(`📋 Eventos encontrados: ${eventsToDelete.length}`);

    if (eventsToDelete.length > 0) {
      eventsToDelete.forEach((event, idx) => {
        console.log(
          `  ${idx + 1}. ID: ${event.id}, Conversation: ${event.conversationId}`
        );
      });

      // Eliminar los eventos
      const result = await prisma.conversationEvent.deleteMany({
        where: {
          eventType: 'NOTE',
          payload: {
            contains: '/9j/4AAQSkZJRgABAQAAAQABAAD',
          },
        },
      });

      console.log(`✅ Notas corrompidas eliminadas: ${result.count}`);
    } else {
      console.log('⚠️ No se encontraron notas con imagen base64.');
    }
  } catch (error) {
    console.error('❌ Error al eliminar:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteCorruptedNote();

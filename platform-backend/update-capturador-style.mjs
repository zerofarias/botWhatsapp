import { prisma } from './dist/config/prisma.js';

async function updateCapturadorNode() {
  try {
    console.log('Actualizando nodo capturador con estilo especial...');

    const node = await prisma.flow.findUnique({
      where: { id: 23 },
    });

    if (!node) {
      console.error('Nodo 23 no encontrado');
      process.exit(1);
    }

    const metadata =
      typeof node.metadata === 'string'
        ? JSON.parse(node.metadata)
        : node.metadata;

    // Agregar flag de capturador
    const updatedMetadata = {
      ...metadata,
      builder: {
        ...metadata.builder,
        isCaptureNode: true, // Flag para identificar nodo capturador
      },
    };

    const updated = await prisma.flow.update({
      where: { id: 23 },
      data: {
        metadata: updatedMetadata,
      },
    });

    console.log('✓ Nodo capturador actualizado con metadata');
    console.log(JSON.stringify(updated.metadata, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateCapturadorNode();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Obtener todos los nodos CAPTURE
  const captures = await prisma.flow.findMany({
    where: {
      type: 'CAPTURE',
    },
    select: {
      id: true,
      name: true,
      type: true,
      metadata: true,
    },
  });

  console.log('\n=== NODOS CAPTURE EN LA BASE DE DATOS ===\n');
  captures.forEach((node) => {
    console.log(`Node ${node.id} (${node.name}):`);
    console.log(`  type: ${node.type}`);
    if (node.metadata && typeof node.metadata === 'object') {
      const meta = node.metadata;
      if ('builder' in meta) {
        const builder = meta.builder;
        console.log(
          `  metadata.builder.responseVariableName: "${builder?.responseVariableName}"`
        );
        console.log(
          `  metadata.builder.waitForResponse: ${builder?.waitForResponse}`
        );
      }
    }
    console.log('');
  });

  // También mostrar el JSON completo del primer CAPTURE
  if (captures.length > 0) {
    console.log('=== PRIMER CAPTURE - JSON COMPLETO ===\n');
    console.log(JSON.stringify(captures[0], null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

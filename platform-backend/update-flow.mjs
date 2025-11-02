import { prisma } from './dist/config/prisma.js';

async function updateFlow() {
  try {
    console.log('1. Creando nodo capturador...');
    const capturadorNode = await prisma.flow.create({
      data: {
        name: 'Capturador',
        type: 'TEXT',
        trigger: null,
        message: '',
        parentId: null,
        areaId: null,
        orderIndex: 0,
        metadata: {
          builder: {
            reactId: 'capturador-respuesta-node',
            position: { x: 569, y: 500 },
            type: 'TEXT',
            width: null,
            height: null,
            options: [],
            conditions: [],
            messageType: 'TEXT',
            waitForResponse: true,
            responseVariableName: 'saludo',
            responseVariableType: 'string',
            buttonTitle: null,
            buttonFooter: null,
            listButtonText: null,
            listTitle: null,
            listDescription: null,
          },
        },
        isActive: true,
        createdBy: 3,
        botId: 1,
      },
    });
    console.log(`✓ Nodo capturador creado con ID: ${capturadorNode.id}`);

    console.log('\n2. Removiendo conexión antigua (21 → 22)...');
    const deletedConnection = await prisma.flowConnection.deleteMany({
      where: {
        fromId: 21,
        toId: 22,
      },
    });
    console.log(`✓ Conexiones removidas: ${deletedConnection.count}`);

    console.log('\n3. Creando conexión (21 → capturador)...');
    const conn1 = await prisma.flowConnection.create({
      data: {
        fromId: 21,
        toId: capturadorNode.id,
        trigger: 'f111443b_7e68_4f06_8ded_28141808bf35',
      },
    });
    console.log(`✓ Conexión creada: 21 → ${capturadorNode.id}`);

    console.log('\n4. Creando conexión (capturador → 22)...');
    const conn2 = await prisma.flowConnection.create({
      data: {
        fromId: capturadorNode.id,
        toId: 22,
        trigger: 'respuesta_capturada',
      },
    });
    console.log(`✓ Conexión creada: ${capturadorNode.id} → 22`);

    console.log('\n✓✓✓ Flujo actualizado correctamente ✓✓✓');
    console.log('\nNueva estructura:');
    console.log(
      '  21 (Opciones) → ' +
        capturadorNode.id +
        ' (Capturador) → 22 (CONDITIONAL)'
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateFlow();

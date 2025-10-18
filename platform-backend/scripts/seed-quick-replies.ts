import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedQuickReplies() {
  console.log('🌱 Sembrando respuestas rápidas...\n');

  const quickReplies = [
    // Respuestas globales básicas
    {
      title: 'Saludo Inicial',
      content: 'Hola! 👋 Bienvenido/a. ¿En qué puedo ayudarte hoy?',
      shortcut: '/saludo',
      isGlobal: true,
      order: 1,
    },
    {
      title: 'Saludo Formal',
      content:
        'Buenos días/tardes. Gracias por contactarnos. Mi nombre es [OPERADOR] y estaré encantado/a de ayudarte.',
      shortcut: '/saludoformal',
      isGlobal: true,
      order: 2,
    },
    // Información general
    {
      title: 'Horarios de Atención',
      content:
        'Nuestro horario de atención es:\n📅 Lunes a Viernes: 8:00 a 18:00 hs\n📅 Sábados: 9:00 a 13:00 hs\n\nFuera de este horario, puedes dejarnos tu consulta y te responderemos a la brevedad.',
      shortcut: '/horarios',
      isGlobal: true,
      order: 3,
    },
    {
      title: 'Medios de Contacto',
      content:
        '📞 Teléfono: +54 351 555-1234\n📧 Email: info@empresa.com\n🌐 Web: www.empresa.com\n📍 Dirección: Calle Falsa 123, Córdoba',
      shortcut: '/contacto',
      isGlobal: true,
      order: 4,
    },
    // Respuestas de proceso
    {
      title: 'En Proceso',
      content:
        '✅ Tu consulta está siendo procesada. Te responderemos a la brevedad.',
      shortcut: '/proceso',
      isGlobal: true,
      order: 5,
    },
    {
      title: 'Información Recibida',
      content:
        'Perfecto! ✓ Hemos recibido tu información. Un agente se comunicará contigo en las próximas 24-48 horas.',
      shortcut: '/recibido',
      isGlobal: true,
      order: 6,
    },
    {
      title: 'Derivando',
      content:
        '🔄 Estoy derivando tu consulta al área correspondiente. Enseguida te atienden.',
      shortcut: '/derivar',
      isGlobal: true,
      order: 7,
    },
    // Solicitud de información
    {
      title: 'Solicitar Datos',
      content:
        'Para poder ayudarte mejor, necesito que me proporciones:\n• Nombre completo\n• DNI\n• Teléfono de contacto\n• Motivo de la consulta',
      shortcut: '/solicitardatos',
      isGlobal: true,
      order: 8,
    },
    {
      title: 'Solicitar Email',
      content:
        '📧 Por favor, ¿podrías proporcionarme tu dirección de correo electrónico?',
      shortcut: '/email',
      isGlobal: true,
      order: 9,
    },
    {
      title: 'Solicitar DNI',
      content:
        '🆔 Por favor, indícame tu número de DNI para poder ubicar tu información.',
      shortcut: '/dni',
      isGlobal: true,
      order: 10,
    },
    // Despedidas
    {
      title: 'Despedida',
      content:
        'Gracias por contactarnos! 😊 Que tengas un excelente día. Estamos a tu disposición para lo que necesites.',
      shortcut: '/despedida',
      isGlobal: true,
      order: 11,
    },
    {
      title: 'Despedida Corta',
      content: 'Gracias! Hasta pronto 👋',
      shortcut: '/chau',
      isGlobal: true,
      order: 12,
    },
    // Información de productos/servicios
    {
      title: 'Formas de Pago',
      content:
        '💳 Aceptamos las siguientes formas de pago:\n• Efectivo\n• Tarjetas de débito y crédito\n• Transferencia bancaria\n• Mercado Pago',
      shortcut: '/pago',
      isGlobal: true,
      order: 13,
    },
    {
      title: 'Envíos',
      content:
        '📦 Realizamos envíos a todo el país:\n• CABA y GBA: 24-48hs\n• Interior: 3-5 días hábiles\n• Costo de envío: Calculado según destino',
      shortcut: '/envios',
      isGlobal: true,
      order: 14,
    },
    // Gestión de tickets/consultas
    {
      title: 'Número de Seguimiento',
      content:
        '🔍 Tu número de seguimiento es: [NÚMERO]\nPuedes consultar el estado en nuestra web ingresando este código.',
      shortcut: '/seguimiento',
      isGlobal: true,
      order: 15,
    },
    {
      title: 'Espera por Favor',
      content: '⏳ Un momento por favor, estoy verificando la información...',
      shortcut: '/espera',
      isGlobal: true,
      order: 16,
    },
    // Respuestas para casos específicos
    {
      title: 'Fuera de Horario',
      content:
        '🌙 Actualmente nos encontramos fuera del horario de atención.\n\nNuestro horario es:\n📅 Lunes a Viernes: 8:00 a 18:00 hs\n\nDejanos tu consulta y te responderemos en cuanto volvamos. Gracias!',
      shortcut: '/fuerahorario',
      isGlobal: true,
      order: 17,
    },
    {
      title: 'Consulta Recibida',
      content:
        '✅ Tu consulta ha sido registrada con éxito.\n📋 Número de ticket: [NÚMERO]\n⏰ Tiempo estimado de respuesta: 24-48hs',
      shortcut: '/ticket',
      isGlobal: true,
      order: 18,
    },
    // Agradecimientos
    {
      title: 'Gracias por Esperar',
      content: 'Gracias por tu paciencia! 🙏 Apreciamos mucho tu tiempo.',
      shortcut: '/gracias',
      isGlobal: true,
      order: 19,
    },
    {
      title: 'Agradecer Información',
      content:
        'Muchas gracias por la información proporcionada! 👍 Esto nos ayuda mucho.',
      shortcut: '/graciasinfo',
      isGlobal: true,
      order: 20,
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const reply of quickReplies) {
    try {
      await prisma.quickReply.create({
        data: reply,
      });
      console.log(`✅ Creado: ${reply.title} (${reply.shortcut})`);
      created++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⏭️  Ya existe: ${reply.title} (${reply.shortcut})`);
        skipped++;
      } else {
        console.error(`❌ Error creando ${reply.title}:`, error.message);
      }
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   ✅ Creadas: ${created}`);
  console.log(`   ⏭️  Omitidas: ${skipped}`);
  console.log(`   📝 Total: ${quickReplies.length}`);
}

seedQuickReplies()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

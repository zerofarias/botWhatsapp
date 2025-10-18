-- Script para insertar respuestas rápidas de ejemplo
-- Ejecutar después de crear la tabla quick_replies

INSERT INTO quick_replies (title, content, shortcut, is_global, `order`, created_at, updated_at)
VALUES 
  -- Respuestas globales básicas
  ('Saludo Inicial', 'Hola! 👋 Bienvenido/a. ¿En qué puedo ayudarte hoy?', '/saludo', 1, 1, NOW(), NOW()),
  ('Saludo Formal', 'Buenos días/tardes. Gracias por contactarnos. Mi nombre es [OPERADOR] y estaré encantado/a de ayudarte.', '/saludoformal', 1, 2, NOW(), NOW()),
  
  -- Información general
  ('Horarios de Atención', 'Nuestro horario de atención es:\n📅 Lunes a Viernes: 8:00 a 18:00 hs\n📅 Sábados: 9:00 a 13:00 hs\n\nFuera de este horario, puedes dejarnos tu consulta y te responderemos a la brevedad.', '/horarios', 1, 3, NOW(), NOW()),
  ('Medios de Contacto', '📞 Teléfono: +54 351 555-1234\n📧 Email: info@empresa.com\n🌐 Web: www.empresa.com\n📍 Dirección: Calle Falsa 123, Córdoba', '/contacto', 1, 4, NOW(), NOW()),
  
  -- Respuestas de proceso
  ('En Proceso', '✅ Tu consulta está siendo procesada. Te responderemos a la brevedad.', '/proceso', 1, 5, NOW(), NOW()),
  ('Información Recibida', 'Perfecto! ✓ Hemos recibido tu información. Un agente se comunicará contigo en las próximas 24-48 horas.', '/recibido', 1, 6, NOW(), NOW()),
  ('Derivando', '🔄 Estoy derivando tu consulta al área correspondiente. Enseguida te atienden.', '/derivar', 1, 7, NOW(), NOW()),
  
  -- Solicitud de información
  ('Solicitar Datos', 'Para poder ayudarte mejor, necesito que me proporciones:\n• Nombre completo\n• DNI\n• Teléfono de contacto\n• Motivo de la consulta', '/solicitardatos', 1, 8, NOW(), NOW()),
  ('Solicitar Email', '📧 Por favor, ¿podrías proporcionarme tu dirección de correo electrónico?', '/email', 1, 9, NOW(), NOW()),
  ('Solicitar DNI', '🆔 Por favor, indícame tu número de DNI para poder ubicar tu información.', '/dni', 1, 10, NOW(), NOW()),
  
  -- Despedidas
  ('Despedida', 'Gracias por contactarnos! 😊 Que tengas un excelente día. Estamos a tu disposición para lo que necesites.', '/despedida', 1, 11, NOW(), NOW()),
  ('Despedida Corta', 'Gracias! Hasta pronto 👋', '/chau', 1, 12, NOW(), NOW()),
  
  -- Información de productos/servicios
  ('Formas de Pago', '💳 Aceptamos las siguientes formas de pago:\n• Efectivo\n• Tarjetas de débito y crédito\n• Transferencia bancaria\n• Mercado Pago', '/pago', 1, 13, NOW(), NOW()),
  ('Envíos', '📦 Realizamos envíos a todo el país:\n• CABA y GBA: 24-48hs\n• Interior: 3-5 días hábiles\n• Costo de envío: Calculado según destino', '/envios', 1, 14, NOW(), NOW()),
  
  -- Gestión de tickets/consultas
  ('Número de Seguimiento', '🔍 Tu número de seguimiento es: [NÚMERO]\nPuedes consultar el estado en nuestra web ingresando este código.', '/seguimiento', 1, 15, NOW(), NOW()),
  ('Espera por Favor', '⏳ Un momento por favor, estoy verificando la información...', '/espera', 1, 16, NOW(), NOW()),
  
  -- Respuestas para casos específicos
  ('Fuera de Horario', '🌙 Actualmente nos encontramos fuera del horario de atención.\n\nNuestro horario es:\n📅 Lunes a Viernes: 8:00 a 18:00 hs\n\nDejanos tu consulta y te responderemos en cuanto volvamos. Gracias!', '/fuerahorario', 1, 17, NOW(), NOW()),
  ('Consulta Recibida', '✅ Tu consulta ha sido registrada con éxito.\n📋 Número de ticket: [NÚMERO]\n⏰ Tiempo estimado de respuesta: 24-48hs', '/ticket', 1, 18, NOW(), NOW()),
  
  -- Agradecimientos
  ('Gracias por Esperar', 'Gracias por tu paciencia! 🙏 Apreciamos mucho tu tiempo.', '/gracias', 1, 19, NOW(), NOW()),
  ('Agradecer Información', 'Muchas gracias por la información proporcionada! 👍 Esto nos ayuda mucho.', '/graciasinfo', 1, 20, NOW(), NOW());

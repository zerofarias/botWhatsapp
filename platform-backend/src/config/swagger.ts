/**
 * @copyright Copyright (c) 2025 zerofarias
 * @author zerofarias
 * @file Especificación OpenAPI para Swagger UI
 */

export const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API BotWhatsapp',
    version: '1.0.0',
    description: 'Documentación interactiva de la API BotWhatsapp',
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Servidor local',
    },
  ],
};

export const swaggerOptions = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

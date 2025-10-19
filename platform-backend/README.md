# WPPConnect Platform - Backend

Este servicio expone la API REST de la plataforma WPPConnect y gestiona la integracion con WhatsApp a traves de la libreria `@wppconnect-team/wppconnect`.

## Novedades octubre 2025

- **Condiciones en flujos**: cada nodo puede guardar un arreglo `conditions` con `match`, `matchMode` (`EXACT`, `CONTAINS`, `REGEX`) y `targetId`, lo que permite ramificar conversaciones sin depender unicamente de botones.
- **Persistencia del grafo**: los endpoints `GET/POST /flows/graph` serializan las condiciones junto con `options`, y etiquetan cada arista con `optionId` o `conditionId` para que el frontend reconstruya el flujo sin perder conexiones.
- **Evaluacion en runtime**: el bot analiza primero las condiciones (texto normalizado y literal); si alguna coincide, responde con el mensaje del nodo destino y actualiza `currentFlowNodeId`. Los triggers clasicos siguen funcionando como respaldo.
- **Proyeccion Prisma**: la seleccion de conversaciones ahora incluye `currentFlowNodeId` y datos completos del contacto, evitando errores de tipado al componer respuestas.
- **Envio de mensajes**: el envio directo usa `cache.client.sendText(...)`, corrigiendo la referencia a un cliente inexistente.

### Ejemplo de metadata

```json
{
  "builder": {
    "reactId": "flow-12",
    "messageType": "TEXT",
    "options": [
      {
        "id": "opt-pagos",
        "label": "Pagos",
        "trigger": "1,pagos",
        "targetId": "flow-34"
      }
    ],
    "conditions": [
      {
        "id": "cond-highvalue",
        "label": "Ticket alto",
        "match": "\\b(transferencia|tarjeta)\\b",
        "matchMode": "REGEX",
        "targetId": "flow-57"
      }
    ]
  }
}
```

> Si varias condiciones coinciden se ejecuta la primera; si ninguna aplica, se evalua la lista de triggers y, como ultimo recurso, se reenvia el menu principal.

## Configuracion de la base de datos

1. **Crear base de datos**
   ```sql
   CREATE DATABASE IF NOT EXISTS `wppconnect_platform`
     DEFAULT CHARACTER SET utf8mb4
     DEFAULT COLLATE utf8mb4_unicode_ci;
   ```
2. **Variables de entorno**
   ```
   DATABASE_URL="mysql://root:@localhost:3306/wppconnect_platform"
   ```
3. **Usuario de prueba**
   ```bash
   npm run seed:test-user
   # Crea o actualiza test@example.com con contrasena Test1234!
   ```

## Puesta en marcha

```bash
npm install
npm run dev   # servidor con recarga
npm run build # compila TypeScript
```

La API queda disponible en `http://localhost:4000`.

## Referencia rapida de flujos

- `MENU`: nodo raiz; su mensaje se envia cuando la conversacion es nueva.
- `TEXT`: acepta triggers y ahora condiciones para evaluar caminos alternativos.
- `REDIRECT`: mantiene la logica de reasignacion y control horario.
- `END`: finaliza la conversacion sin cerrar al contacto manualmente.

Para capturar respuestas de listas o botones, inicia la sesion con webhook (`POST /api/{session}/start-session`) y procesa los eventos entrantes.

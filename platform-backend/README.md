# WPPConnect Platform - Backend

Este servicio expone la API REST de la plataforma WPPConnect y gestiona la integracion con WhatsApp a traves de la libreria `@wppconnect-team/wppconnect`.

## Novedades octubre 2025

- **Condiciones en flujos**: cada nodo puede guardar un arreglo `conditions` con `match`, `matchMode` (`EXACT`, `CONTAINS`, `REGEX`) y `targetId`, lo que permite ramificar conversaciones sin depender unicamente de botones.
- **Persistencia del grafo**: los endpoints `GET/POST /flows/graph` serializan las condiciones junto con `options`, y etiquetan cada arista con `optionId` o `conditionId` para que el frontend reconstruya el flujo sin perder conexiones.
- **API unificada del Flow Builder**: los endpoints REST individuales (`/flows`, `/flows/:id`, `/flows/edges`) quedaron obsoletos. Toda la edición se realiza serializando el grafo completo con `GET /flows/graph` + `POST /flows/save-graph`, garantizando que backend y frontend compartan el mismo contrato.
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
npm run build # compila TypeScript y corrige imports con tsc-alias
```

> Nota: El script de build ejecuta automáticamente `tsc-alias` para corregir los imports relativos y agregar la extensión `.js` en los archivos de la carpeta `dist`, asegurando compatibilidad con Node.js en modo ES Modules. En los archivos fuente TypeScript, mantén los imports sin extensión.
> La API queda disponible en `http://localhost:4000`.

## Referencia rapida de flujos

- `MENU`: nodo raiz; su mensaje se envia cuando la conversacion es nueva.
- `TEXT`: acepta triggers y ahora condiciones para evaluar caminos alternativos.
- `REDIRECT`: mantiene la logica de reasignacion y control horario.
- `END`: finaliza la conversacion sin cerrar al contacto manualmente.

Para capturar respuestas de listas o botones, inicia la sesion con webhook (`POST /api/{session}/start-session`) y procesa los eventos entrantes.

## Frontend: Dashboard React

### Flujos y edición visual (FlowsPage)

La página `FlowsPage.tsx` permite crear, editar y visualizar la jerarquía de flujos conversacionales de cada bot. Su diseño está orientado a la gestión visual y rápida de pasos automáticos, menús y derivaciones.

#### Estructura principal

- **Formulario de edición/creación**: Permite definir nombre, tipo, orden, disparador, mensaje, área destino y metadata avanzada (opciones, botones, listas).
- **Mapa de flujos**: Muestra la jerarquía de pasos, permitiendo editar/eliminar cada nodo y visualizar sus hijos.

#### Props y tipos

- `FlowType`: 'MESSAGE', 'MENU', 'ACTION', 'REDIRECT', 'END'.
- `FlowMessageKind`: 'TEXT', 'BUTTONS', 'LIST'.
- `FlowNode`: Nodo de flujo con hijos, metadata y estado.
- `FlowMetadata`: Configuración avanzada para opciones, botones y listas.

#### Lógica y funciones clave

- **fetchData**: Obtiene flujos y áreas desde la API REST.
- **handleEdit**: Carga los datos de un nodo para edición.
- **handleDelete**: Elimina un paso del flujo.
- **handleSubmit**: Envía el formulario para crear/actualizar un flujo.
- **FlowTreeItem**: Componente recursivo para mostrar la jerarquía de nodos.
- **flattenFlows**: Utilidad para aplanar la estructura de flujos.

#### Integración con la API

- Utiliza el servicio `api` para consumir endpoints `/flows` y `/areas`.
- El payload incluye metadata estructurada para opciones, botones y listas, permitiendo automatizar respuestas y menús en WhatsApp.

#### Ejemplo visual

- El usuario puede crear un menú principal, agregar opciones y condiciones, y derivar a áreas u operadores según la lógica del negocio.
- Cada nodo muestra su tipo, disparador, mensaje y estado, facilitando la edición y el control de la conversación.

### Otras vistas y navegación

- **BotsPage**: Lista de bots, selección y creación.
- **FlowNodesPage**: Nodos de un flujo, edición y creación.
- **ChatHistoryPage, ContactsPage, AreasPage, UsersPage**: Gestión de historial, contactos, áreas y usuarios.

### Integración con la API

- Servicios en `/src/api` y `/src/services` para consumir endpoints REST.
- Contextos y hooks para manejo de estado global (bot, flujo, usuario).
- Componentes reutilizables para formularios, listas y edición de nodos/flujos.

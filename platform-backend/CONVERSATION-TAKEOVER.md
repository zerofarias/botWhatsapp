---
# Lógica de ejecución de nodos conversacionales

## ¿Qué es?
La lógica de ejecución de nodos es el conjunto de reglas y funciones que determinan cómo se procesa cada nodo del flujo conversacional. Cada tipo de nodo tiene una función específica y el sistema ejecuta acciones según el tipo.

## Tipos de nodo y su función
- **START**: Inicia el flujo, muestra mensaje de bienvenida y avanza.
- **TEXT**: Envía texto al usuario y espera respuesta o avanza automáticamente.
- **CONDITIONAL**: Evalúa una condición y decide el siguiente nodo (true/false).
- **DELAY**: Espera un tiempo antes de mostrar el siguiente mensaje.
- **SCHEDULE**: Evalúa si la fecha/hora actual está dentro de un rango definido y ramifica el flujo según el resultado (por ejemplo, horario laboral vs fuera de horario).
- **REDIRECT_BOT**: Transfiere la conversación a otro bot.
- **REDIRECT_AGENT**: Finaliza el bot y asigna la conversación a un agente humano.
- **AI**: Consulta un modelo de IA y procesa la respuesta.
- **SET_VARIABLE**: Guarda o modifica una variable en el contexto.
- **END**: Termina el flujo y espera acción del usuario o cierre.

## ¿Cómo se implementa?
1. Se crea un servicio que recibe el nodo actual y el contexto de la conversación.
2. Según el tipo de nodo, ejecuta la acción correspondiente (enviar mensaje, esperar, evaluar condición, etc.).
3. Actualiza el contexto y determina el siguiente nodo.
4. El controlador de mensajes llama a este servicio cada vez que hay interacción.

## Ventajas
- Modularidad: cada tipo de nodo es una función independiente.
- Flexibilidad: puedes agregar nuevos tipos de nodo fácilmente.
- Escalabilidad: soporta flujos complejos y personalizados.

## Siguiente paso
Avanzar con la implementación en el backend: definir la estructura de servicios y controladores para procesar cada tipo de nodo y avanzar en el flujo conversacional.
# Plan de Acción: Control de Conversación Bot/Operador

## 1. Estado de la conversación

- **Campos clave en la base de datos:**
  - `botActive` (boolean): Indica si el bot está gestionando la conversación.
  - `assignedTo` (userId): Indica si un operador está gestionando la conversación.
  - `currentFlowNodeId` (int): Nodo actual del flujo conversacional.
  - `context` (json): Estado/contexto adicional de la conversación.

## 2. Lógica de UI (Frontend)

- **Bloqueo de input/textarea:**
  - Si `botActive: true` y `assignedTo: null`, el input/textarea del chat debe estar deshabilitado para el operador.
  - Mostrar mensaje: “La conversación está siendo gestionada por el bot”.

- **Botón “TOMAR” en la UI:**
  - Ubicación: Junto al botón “FINALIZAR” en la cabecera del chat.
  - Acción: Al hacer clic, se envía una petición al backend para asignar la conversación al operador actual y desactivar el bot (`botActive: false`, `assignedTo: userId`).
  - Tras tomar la conversación, el input/textarea se habilita para el operador.

- **Botón “FINALIZAR”:**
  - Permite cerrar la conversación y devolver el control al bot o finalizar la sesión.

- **Indicadores visuales:**
  - Mostrar claramente si la conversación está en modo bot o operador.
  - Sugerencia: Usar badges, colores o iconos para distinguir el estado.

## 3. Lógica de backend

- **Endpoint para tomar la conversación:**
  - Ruta: `POST /conversations/:id/take`
  - Acción: Asigna la conversación al operador y pone `botActive: false`.

- **Endpoint para finalizar la conversación:**
  - Ruta: `POST /conversations/:id/finish`
  - Acción: Cierra la conversación y actualiza el estado.

- **Validación en la lógica del bot:**
  - Antes de que el bot responda, verificar que `botActive: true` y `assignedTo: null`.
  - Si la conversación está asignada a un operador, el bot no debe interactuar.

## 4. Ideas y sugerencias adicionales

- **Timeout de operador:** Si el operador no responde en X minutos, devolver el control al bot automáticamente.
- **Historial de cambios:** Registrar eventos de toma y finalización en el historial de la conversación.
- **Notificaciones:** Avisar al operador cuando una conversación está disponible para ser tomada.
- **Permisos:** Solo operadores autorizados pueden tomar o finalizar conversaciones.
- **Auditoría:** Guardar logs de quién tomó, finalizó o devolvió la conversación.

## 5. Documentación y comunicación

- Documentar el flujo en el README y en la wiki del proyecto.
- Incluir diagramas de estados y ejemplos de UI.
- Explicar la lógica en los comentarios del código y en los endpoints.

## Ejemplo de payloads y respuestas

### Tomar conversación
**POST /conversations/:id/take**
```json
{
  "operatorId": 123
}
```
**Respuesta:**
```json
{
  "success": true,
  "assignedTo": 123,
  "botActive": false
}
```

### Finalizar conversación
**POST /conversations/:id/finish**
```json
{
  "reason": "manual_close"
}
```
**Respuesta:**
```json
{
  "success": true,
  "status": "CLOSED"
}
```

---

---

---

# Plan de robustecimiento y documentación del flujo conversacional

## 1. Tipado estricto del contexto conversacional

### Definición de `ConversationContext`

El contexto de cada conversación debe tener una estructura clara y tipada. Ejemplo de interfaz:

```typescript
export interface ConversationContext {
  lastMessage: string;
  previousNode: number | null;
  updatedAt: string;
  flowTransition?: 'advanced' | 'no_change';
  [key: string]: unknown; // Para extensiones futuras
}
```

**Acciones realizadas:**

- Se eliminó el uso de `any` y se reemplazó por `ConversationContext` en todos los servicios y controladores.
- Se refactorizó la persistencia y recuperación del contexto para cumplir con el tipado estricto.

**Ventajas:**

- Prevención de errores por datos inesperados.
- Facilita la validación y el mantenimiento.

---

## 2. Lógica avanzada de transición de flujo

### Implementación de reglas y condiciones

La función `getNextNodeAndContext` ahora soporta:

- Búsqueda de nodos hijos por trigger exacto.
- Posibilidad de extender a condiciones complejas (por contexto, variables, etc.).
- Acciones asociadas a nodos (ejemplo: enviar mensajes, guardar datos, ejecutar lógica).

**Ejemplo de transición:**
Si el mensaje recibido coincide con el trigger de un nodo hijo, se avanza a ese nodo y se actualiza el contexto. Si no, se mantiene el nodo actual y se registra el intento en el contexto.

**Extensiones futuras:**

- Soporte para triggers múltiples, fallback, y acciones encadenadas.
- Integración con reglas de negocio y validaciones externas.

---

## 3. Pruebas unitarias y de integración

### Estrategia de pruebas

- Pruebas unitarias para la función de transición y el tipado de contexto.
- Pruebas de integración para el controlador de mensajes y la persistencia de estado.
- Simulación de escenarios completos: avance de nodos, errores, condiciones especiales.
- Automatización en CI/CD para asegurar calidad continua.

**Ejemplo de caso de prueba:**

1. Crear conversación con contexto inicial.
2. Enviar mensaje trigger y validar transición de nodo y actualización de contexto.
3. Verificar persistencia y recuperación del estado.

---

## 4. Documentación técnica y de negocio

### Estructura esperada del contexto

```json
{
  "lastMessage": "Hola",
  "previousNode": 1,
  "updatedAt": "2025-10-24T12:00:00Z",
  "flowTransition": "advanced"
}
```

### Triggers en el flujo

- Cada nodo puede tener uno o más triggers (palabras clave, comandos, etc.) que permiten avanzar en el flujo.
- Los triggers deben ser únicos por nodo y estar documentados en la configuración del flujo.

**Ejemplo de configuración de nodo:**

```json
{
  "id": 2,
  "trigger": "continuar",
  "message": "¿Deseas avanzar?",
  "type": "QUESTION"
}
```

### Diagramas y payloads

- Se recomienda documentar el flujo con diagramas visuales y ejemplos de payloads para cada transición.
- Actualizar Swagger y los archivos de negocio con ejemplos reales.

---

## Impacto y siguientes pasos

- El sistema ahora es más robusto, auditable y fácil de mantener.
- El tipado estricto y la lógica avanzada permiten escalar y adaptar el flujo a nuevas necesidades.
- Las pruebas y la documentación aseguran calidad y facilidad de integración.

**Siguientes pasos recomendados:**

1. Validar el tipado en todos los puntos de entrada/salida del contexto.
2. Extender la lógica de transición para reglas más complejas.
3. Completar y automatizar las pruebas unitarias/integración.
4. Mantener la documentación actualizada con cada cambio relevante.

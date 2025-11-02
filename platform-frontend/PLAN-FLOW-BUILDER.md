## Refactorización de renderizado y tipado en NodeEditor

Se adaptó el renderizado de formularios en `NodeEditor.tsx` para aprovechar los nuevos tipos discriminados de nodo:

- Cada tipo de nodo ahora accede solo a los campos relevantes de su interfaz.
- El renderizado es seguro y estrictamente tipado, evitando errores de acceso a propiedades inexistentes.
- El código es más claro, mantenible y fácil de extender.

Esta refactorización garantiza que el Flow Builder sea robusto y que cada formulario muestre y edite solo los datos pertinentes a su tipo de nodo.

## Estado actual de la iteración (24/10/2025)

---

### Cierre de la iteración: refactorización y migración completa (24/10/2025)

**Resumen de cambios realizados:**

- Refactorización total del tipado de nodos usando discriminated unions y tipos estrictos alineados con backend/documentación.
- Eliminación de todos los tipos legacy y campos genéricos (`MENU`, `options`, `conditions`, `areaId`, etc.) en la creación, duplicación y serialización de nodos.
- Modularización y type-safety en todos los formularios y lógica de edición de nodos.
- Migración y normalización automática de nodos legacy a la nueva estructura, con fallback seguro y exhaustivo.
- Limpieza de imports, helpers y utilidades legacy.
- Eliminación total de `any` y uso de type guards para acceso seguro a campos según el tipo de nodo.
- UI mejorada: selector de tipo de nodo al crear, y duplicación segura.
- Documentación detallada de cada paso y decisión en este archivo.

**Estado final:**

- El Flow Builder es 100% type-safe, modular y preparado para futuras extensiones.
- No quedan referencias a tipos legacy ni código espagueti.
- El código es robusto ante migraciones y cambios futuros de tipos.
- Todos los errores y advertencias de tipado han sido resueltos.

**Recomendaciones para futuras iteraciones:**

- Si se agregan nuevos tipos de nodo, definir su interfaz discriminada y actualizar los type guards donde corresponda.
- Mantener la documentación y los ejemplos actualizados.
- Validar siempre la migración de datos legacy si se modifican los tipos base.

---

### Avances realizados

- Se creó y documentó el plan de rediseño visual y funcional del Flow Builder.
- Se desarrollaron componentes React modulares y tipados para cada tipo de nodo conversacional (START, TEXT, CONDITIONAL, DELAY, SCHEDULE, REDIRECT_BOT, REDIRECT_AGENT, AI, SET_VARIABLE, END).
- Se integraron estos formularios en el editor de nodos (`NodeEditor.tsx`), permitiendo edición visual y validación específica por tipo de nodo.
- Se documentó la integración y modularidad en este archivo.
- Se detectó inconsistencia entre los tipos de nodo del frontend y los definidos en backend/documentación, lo que genera errores de tipado y enums.

### Próximos pasos detallados para continuar la iteración

1. **Unificación de tipos de nodo**
   - Actualizar el enum/array `FLOW_NODE_TYPES` y los tipos asociados en `types.ts` para reflejar exactamente los tipos de nodo soportados/documentados:
     - 'START', 'TEXT', 'CONDITIONAL', 'DELAY', 'SCHEDULE', 'REDIRECT_BOT', 'REDIRECT_AGENT', 'AI', 'SET_VARIABLE', 'END'.
   - Actualizar los labels y descripciones (`FLOW_NODE_TYPE_LABELS`, `FLOW_NODE_TYPE_DESCRIPTIONS`) para cada tipo.
   - Adaptar la estructura de `FlowNodeData` para que cada tipo tenga solo los campos relevantes (usando interfaces discriminadas si es posible).

---

### Estrategia de migración y validación de nodos (24/10/2025)

**Resumen:**
El sistema tenía nodos legacy con tipo 'MENU' y campos genéricos. Ahora, cada tipo de nodo tiene su propia interfaz discriminada y campos estrictos. Es necesario migrar la creación, duplicación y normalización de nodos para que usen los nuevos tipos y estructuras.

**Pasos de migración:**

1. Actualizar la función `createNode` para que reciba el tipo de nodo y genere la estructura inicial estrictamente tipada según el discriminante (`type`).
   - Cada tipo de nodo tendrá sus campos obligatorios y valores por defecto.
   - Eliminar referencias a 'MENU' y campos obsoletos.
2. Actualizar la función `normalizeNodeFromServer` para mapear datos legacy a los nuevos tipos, migrando nodos antiguos ('MENU', etc.) a los nuevos ('TEXT', 'START', etc.) y eliminando campos irrelevantes.
3. Actualizar la duplicación de nodos para que solo copie los campos válidos según el tipo.
4. Eliminar referencias a 'MENU' y campos genéricos en todo el flujo de creación y edición de nodos.
5. Documentar el proceso y los cambios en este archivo.

---

#### Paso 1: Refactorizar `createNode` para inicialización estrictamente tipada

- La función `createNode` debe aceptar el tipo de nodo (`FlowNodeType`) y devolver la estructura inicial correspondiente, usando los tipos discriminados definidos en `types.ts`.
- Cada tipo tendrá sus campos obligatorios y valores por defecto (por ejemplo, `label`, `message`, `seconds`, etc.).
- Se eliminarán los campos legacy como `type: 'MENU'`, `options`, `conditions`, `areaId`, `messageKind`, etc., de la inicialización genérica.
- Se documentará la estructura inicial de cada tipo de nodo en este archivo para referencia futura.

**Ejemplo de uso esperado:**

```ts
createNode('TEXT', position);
// => { id, position, type: 'default', data: { type: 'TEXT', label: 'Mensaje', message: '', messageKind: 'TEXT', ... } }
```

---

2. **Refactorización del renderizado en NodeEditor**

   - Ajustar el switch/case de renderizado para que use los nuevos tipos y props correctos.
   - Validar que cada formulario reciba y actualice solo los datos pertinentes a su tipo de nodo.
   - Eliminar código legacy de tipos antiguos ('MENU', 'MESSAGE', 'ACTION', etc.).

3. **Validación y migración de datos existentes**

   - Si existen flujos/nodos guardados con tipos antiguos, migrar sus datos a la nueva estructura.
   - Proveer funciones utilitarias para migrar nodos y flujos automáticamente.

4. **Pruebas funcionales y de UI**

   - Probar la creación, edición y conexión de cada tipo de nodo en el Flow Builder.
   - Validar que los formularios muestran solo los campos relevantes y que las validaciones funcionan.
   - Verificar la persistencia y carga de flujos con los nuevos tipos.

5. **Documentación y ejemplos**

   - Documentar en este archivo y en el README del frontend ejemplos de uso para cada tipo de nodo.
   - Incluir capturas de pantalla o diagramas del nuevo Flow Builder.
   - Explicar cómo extender con nuevos tipos de nodo en el futuro.

6. **Revisión de código y modularidad**
   - Revisar que todos los componentes estén bien tipados y documentados.
   - Centralizar estilos y constantes de color/iconografía.
   - Mejorar la estructura de carpetas si es necesario.

---

**Puedes continuar la iteración desde el punto 1: unificación de tipos de nodo en el frontend.**
Cada paso está detallado para que puedas avanzar de forma ordenada y sin perder contexto.

## Integración de formularios modulares por tipo de nodo

Se integraron los siguientes componentes visuales y tipados en el Flow Builder:

- StartNodeForm: Nodo de inicio, no editable.
- TextNodeForm: Mensaje de texto, con opción de esperar respuesta y guardar en variable.
- ConditionalNodeForm: Nodo condicional, permite definir expresiones.
- DelayNodeForm: Nodo de espera, define segundos de pausa.
- ScheduleNodeForm: Nodo de horario, define rango horario y ramificación.
- RedirectBotNodeForm: Redirección a otro bot.
- RedirectAgentNodeForm: Redirección a agente humano.
- AINodeForm: Consulta a IA, permite prompt y modelo.
- SetVariableNodeForm: Seteo de variable en contexto.
- EndNodeForm: Nodo de fin, no editable.

Cada formulario es único, modular y con validaciones específicas. El renderizado es automático según el tipo de nodo seleccionado, facilitando la extensión y el mantenimiento del Flow Builder.

# Plan de rediseño estético y funcional del Flow Builder

## 1. Estructura base y reglas

- Al entrar a un bot, el nodo START siempre debe estar presente y visible como punto de inicio.
- Los nodos se agregan desde el START, y cada tipo de nodo muestra un formulario/interface diferente según sus propiedades.
- Cada nodo es único visualmente y en su lógica interna (no hay formularios genéricos).

## 2. Diferenciación visual de nodos

- **START**: Color destacado, ícono de inicio, no editable ni eliminable.
- **TEXT**: Color informativo, ícono de mensaje, formulario para texto, opción “esperar respuesta” y nombre de variable.
- **CONDITIONAL**: Color de advertencia, ícono de condición, campos para condición, nodos de salida “verdadero/falso”.
- **DELAY**: Color neutro, ícono de reloj, campo para segundos de espera.
- **SCHEDULE**: Color azul, ícono de calendario/reloj, campos para horario “desde/hasta” y nodos de salida “dentro/fuera de horario”.
- **REDIRECT_BOT**: Color secundario, ícono de bot, selector de bot destino.
- **REDIRECT_AGENT**: Color de usuario, ícono de agente, selector de agente destino.
- **AI**: Color violeta, ícono de IA, campos para prompt/modelo.
- **SET_VARIABLE**: Color verde, ícono de variable, campos para nombre/valor.
- **END**: Color gris, ícono de fin, no editable.

## 3. Interfaces y validaciones específicas

- Cada tipo de nodo tiene su propio formulario de edición, con validaciones y ayuda contextual.
- Al seleccionar un tipo de nodo, se muestra solo el formulario y opciones relevantes.
- Validar que los campos obligatorios estén completos antes de permitir guardar.
- Mostrar errores claros y ayuda contextual para cada campo.

## 4. Experiencia de usuario

- Drag & drop para reordenar nodos y conectar flujos.
- Animaciones suaves al agregar, editar o eliminar nodos.
- Tooltips y descripciones para cada tipo de nodo.
- Botón “Agregar nodo” siempre visible tras el nodo actual.
- Confirmación visual al guardar cambios en un nodo.

## 5. Accesibilidad y responsividad

- Contrastes adecuados y uso de iconografía clara.
- Soporte para teclado y navegación accesible.
- Diseño responsive para uso en pantallas medianas.

## 6. Código y modularidad

- Crear un componente React por tipo de nodo (ej: `TextNodeForm`, `ConditionalNodeForm`, etc).
- Definir interfaces TypeScript específicas para cada tipo de nodo.
- Centralizar estilos y colores en un archivo de tema.
- Documentar cada componente y sus props.

---

Este plan servirá como guía para el rediseño visual y funcional del Flow Builder, asegurando modularidad, claridad y una experiencia de usuario moderna.

# Plan de implementación: Unificación y mejora de gestión de flujos y bots en el frontend

Fecha: 24/10/2025

## Objetivo

- Eliminar la página /dashboard/flows y su ruta.
- Integrar el Flow Builder dentro de la gestión de cada bot (en /dashboard/bots).
- Permitir crear, editar y visualizar flujos por bot, siempre sabiendo en qué bot y nodo está cada conversación.
- Mejorar la lógica de control bot/operador en el chat.
- Mantener modularidad, tipado estricto y reflejo en tiempo real (Socket.IO).

---

## Tareas detalladas y avance

### 1. Eliminar la página y ruta `/dashboard/flows` ✅ COMPLETADO

- [x] Eliminar la ruta `flows` en `App.tsx`.
- [x] Eliminar la ruta `flow-builder` en `App.tsx`.
- [x] Eliminar el menú/enlace a Flows y Flow Builder del panel lateral (`DashboardLayout.tsx`).
- [x] Eliminar el archivo `FlowsPage.tsx` si ya no es usado.
- [x] El Flow Builder solo es accesible desde la gestión de bots, no como página independiente.

### 2. Integrar Flow Builder en Bots ✅ COMPLETADO

- [x] Modificar `BotsPage.tsx` para que al seleccionar un bot se muestre el Flow Builder asociado a ese bot.
- [x] Permitir crear/editar el flujo del bot seleccionado.
- [x] Mostrar siempre el nombre del bot y el nodo actual en la UI del builder.
- [x] Ajustar rutas si es necesario (por ejemplo: `/dashboard/bots/:id/flow-builder`).

### 3. Lógica de conversación bot/operador en el chat ⏳ EN PROGRESO

- [x] En `ChatView` y `ChatComposer`, bloquear el input si `botActive: true` y `assignedTo: null`.
- [x] Mostrar mensaje: "La conversación está siendo gestionada por el bot".
- [x] Agregar botón “TOMAR” para que el operador tome la conversación (`POST /conversations/:id/take`).
- [x] Agregar botón “FINALIZAR” para cerrar la conversación (`POST /conversations/:id/finish`).
- [x] Mostrar indicadores visuales claros del estado (bot/operador) en el header del chat.
- [x] Reflejar cambios en tiempo real usando Socket.IO (parcial, depende de backend y pruebas).

### 4. Modularidad y tipado ⏳ EN PROGRESO

- [ ] Mantener componentes y hooks bien tipados.
- [ ] Documentar los props y tipos nuevos o modificados.

### 5. Documentación y seguimiento ⏳ EN PROGRESO

- [x] Registrar este plan en `platform-frontend/PLAN-FRONTEND.md`.
- [x] Actualizar el archivo conforme se avance en cada tarea.

---

## Cambios realizados

- Eliminada la ruta y página de flujos duplicada.
- El Flow Builder ahora se accede desde la gestión de bots y muestra el nombre del bot.
- El chat bloquea el input si el bot está activo y no hay operador asignado, muestra mensaje y botón “Tomar”.
- El header del chat indica visualmente el estado (bot/operador) y permite finalizar la conversación.
- El botón “Finalizar” usa el endpoint correcto y actualiza el estado.
- El Flow Builder ahora solo sincroniza GET /flows/graph y POST /flows/save-graph; los CRUD /flows, /flows/:id y /flows/edges quedaron obsoletos.
- Los nodos condicionales ya persisten `sourceVariable`, operadores y la salida “Otro”, y el runtime usa `cond:<id>` para encaminar cada rama (incluido el fallback).
- El formulario de nodos TEXT ahora incluye previsualización, toggle de “Esperar respuesta” y configuración completa de variable/tipos/modelos, previniendo habilitar la captura sin definir low_variable.
- processMessageAndAdvanceFlow persiste la última respuesta en conversation.context.variables[waitingVariable] y libera waitingForInput para que los siguientes nodos se evalúen correctamente.

---

## Posibles problemas o mejoras

- El refresco de estado tras tomar/finalizar una conversación depende de recargar la página; se recomienda mejorar la actualización reactiva vía Socket.IO.
- El tipado de algunos props y estados puede mejorarse para evitar `any` y asegurar robustez.
- El Flow Builder aún no filtra flujos por bot en backend (si se requiere, ajustar endpoints y lógica).
- Validar que los endpoints `/conversations/:id/take` y `/conversations/:id/finish` existan y respondan correctamente en backend.
- Mejorar la experiencia visual y mensajes de error para el usuario final.
- Agregar tests de integración para la lógica de takeover y cierre.
- Ejecutar QA manual del nuevo nodo condicional (texto → condicional → salidas múltiples) y documentar el flujo.
- Validar end-to-end la captura de variables (TEXT con espera → usuario responde → context.variables guarda el valor → condicionales lo consumen).

---

## Siguientes pasos sugeridos

1. Mejorar la actualización reactiva del estado de la conversación usando eventos Socket.IO.
2. Revisar y tipar todos los props y estados nuevos o modificados.
3. Documentar en este archivo cualquier cambio relevante o hallazgo.
4. Validar la experiencia de usuario con operadores reales.

- Registrar/ejecutar el flujo TEXT → CONDICIONAL → TEXT y anotar resultados para cerrar Etapa 2.

---

Responsable inicial: GitHub Copilot

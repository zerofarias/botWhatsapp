# Diagnóstico exhaustivo: Problema de duplicación de nodos y edges no conectados en FlowBuilder

## Resumen del problema

- Al guardar un flujo desde el frontend, el payload enviado al backend incluye correctamente los nodos y los edges (incluyendo la conexión desde el nodo START al siguiente nodo de texto).
- Sin embargo, al recargar el flujo, los nodos aparecen duplicados y la conexión START → TEXT no se muestra en el frontend.

---

## Evidencia observada

### Payload enviado por el frontend

- El JSON enviado contiene los nodos y los edges esperados.
- Ejemplo de edge START → TEXT:
  ```json
  {
    "id": "edge-9341ad18-6d79-46f9-aa68-a8862ee47b8f-8078c557-deae-4186-bcc7-d338c8e8023b-...",
    "source": "9341ad18-6d79-46f9-aa68-a8862ee47b8f",
    "target": "8078c557-deae-4186-bcc7-d338c8e8023b",
    "label": null
  }
  ```
- Sin embargo, el array de nodos aparece duplicado (cada nodo dos veces con el mismo id y datos).

### Comportamiento tras recargar

- Los nodos aparecen duplicados en el frontend.
- La conexión START → TEXT no se muestra.

---

## Análisis de la causa raíz

### 1. Duplicación de nodos

- El hecho de que los nodos aparezcan dos veces en el array indica un bug en la lógica de serialización o reconstrucción del grafo.
- Es probable que el backend esté agregando los nodos dos veces al array de respuesta, posiblemente por un bucle doble o por no filtrar correctamente los nodos únicos.
- Alternativamente, el frontend podría estar procesando la respuesta de forma incorrecta y agregando los nodos dos veces a su estado local.

### 2. Edge START → TEXT no se muestra

- El edge está presente en el payload enviado al backend, pero no se muestra al recargar.
- Esto sugiere que el backend no está devolviendo ese edge en la respuesta, o que el frontend lo está ignorando.
- En implementaciones previas, el backend solo devolvía edges de opciones de nodos tipo TEXT/MENU, ignorando conexiones generales como las de START.
- Si el backend no reconstruye todos los edges desde la base de datos (por ejemplo, usando la tabla de conexiones y los reactId), las conexiones generales se pierden.

### 3. Posibles causas técnicas

- **Backend:**
  - Lógica de reconstrucción de nodos/edges con bucles anidados o sin filtrado de duplicados.
  - Solo serializa edges de opciones, no todos los edges generales.
  - No utiliza la tabla de conexiones para reconstruir todos los edges.
- **Frontend:**
  - Procesa la respuesta y agrega nodos/edges sin filtrar duplicados.
  - Solo renderiza edges con ciertos datos (por ejemplo, solo los que tienen `optionId`).

---

## Consecuencias

- El usuario ve nodos duplicados y flujos visualmente incorrectos.
- Las conexiones generales (como la de START) no se muestran, rompiendo la lógica del flujo conversacional.
- Puede haber inconsistencias entre lo que el usuario modela y lo que realmente se guarda/recupera.

---

## Recomendaciones para resolver

1. **En el backend:**
   - Asegurarse de que la reconstrucción del grafo devuelva solo nodos únicos (por id).
   - Serializar todos los edges usando la tabla de conexiones, no solo los de opciones.
   - Mapear correctamente los `reactId` de los nodos para los edges.
2. **En el frontend:**
   - Filtrar nodos duplicados al procesar la respuesta.
   - Renderizar todos los edges recibidos, no solo los de opciones.

---

## Conclusión

El problema se deriva de una lógica incompleta o incorrecta en la reconstrucción y serialización del grafo, tanto en nodos como en edges. Es fundamental revisar la forma en que el backend arma la respuesta y cómo el frontend la consume, asegurando unicidad de nodos y la inclusión de todas las conexiones relevantes.

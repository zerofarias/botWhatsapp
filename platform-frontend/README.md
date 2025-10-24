# Plataforma Frontend - botWhatsapp

## Integración de Nodos en Flujos

Ahora puedes gestionar nodos individuales dentro de cada flujo de bot desde el dashboard.

### Componente: FlowNodesPage

- Ubicación: `src/pages/FlowNodesPage.tsx`
- Permite listar, crear y visualizar nodos de un flujo.
- Utiliza el endpoint backend: `GET/POST /api/flows/:flowId/nodes`

### Cómo usar

1. Integra el componente en la vista de flujos o bots:
   ```tsx
   import FlowNodesPage from './FlowNodesPage';
   // ...
   <FlowNodesPage flowId={ID_DEL_FLUJO} />;
   ```
2. El formulario permite crear nodos con nombre, tipo, contenido y estado.
3. La lista se actualiza automáticamente tras cada creación.

### Requisitos

- Backend corriendo en puerto 4000 con endpoints de nodos habilitados.
- El flujo debe existir y tener un `id` válido.

### Ejemplo de integración

Puedes agregar un botón en la tabla de bots o flujos para navegar a la gestión de nodos:

```tsx
<button onClick={() => navigate(`/flows/${flow.id}/nodes`)}>Ver nodos</button>
```

---

## Endpoints Backend

- `GET /api/flows/:flowId/nodes` - Lista nodos de un flujo
- `POST /api/flows/:flowId/nodes` - Crea un nodo en el flujo

---

## Actualización

- Documentación generada automáticamente por GitHub Copilot el 23/10/2025.

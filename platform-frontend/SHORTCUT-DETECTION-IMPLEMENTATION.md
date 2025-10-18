# 🔧 Implementación Técnica: Detección Automática de Atajos

## 📋 Resumen

Se implementó un sistema completo de detección automática de atajos (shortcuts) para respuestas rápidas en el chat, permitiendo a los operadores escribir `/atajo` y obtener sugerencias en tiempo real que pueden expandirse al contenido completo.

## 🏗️ Arquitectura

### Componentes Principales

```
platform-frontend/src/
├── hooks/
│   └── useQuickReplies.ts          # Hook para gestión de Quick Replies
├── components/
│   ├── ShortcutSuggestions.tsx     # Componente de sugerencias
│   └── ShortcutSuggestions.css     # Estilos del componente
├── pages/
│   └── ChatPage.tsx                # Integración en chat principal
└── services/
    └── quickReply.service.ts       # Servicio API (ya existente)
```

## 🔌 Componente: `ShortcutSuggestions.tsx`

### Propósito

Renderizar la lista de sugerencias de atajos con navegación por teclado.

### Props

```typescript
interface ShortcutSuggestionsProps {
  suggestions: QuickReply[]; // Lista de sugerencias
  selectedIndex: number; // Índice de la sugerencia seleccionada
  onSelect: (suggestion: QuickReply) => void; // Callback al seleccionar
}
```

### Características

- ✅ Renderizado condicional (solo si hay sugerencias)
- ✅ Resaltado visual de la sugerencia seleccionada
- ✅ Click para seleccionar
- ✅ Animación de entrada suave
- ✅ Diseño responsive

### Ejemplo de Uso

```tsx
{
  suggestions.length > 0 && (
    <ShortcutSuggestions
      suggestions={suggestions}
      selectedIndex={selectedSuggestionIndex}
      onSelect={handleSuggestionSelect}
    />
  );
}
```

## 🎣 Hook: `useQuickReplies`

### Funciones Exportadas

#### `getSuggestions(text: string): QuickReply[]`

Obtiene sugerencias que coinciden con el texto ingresado.

**Comportamiento:**

- Retorna array vacío si el texto no empieza con `/`
- Filtra atajos que empiezan con el texto (case-insensitive)
- Limita a 5 sugerencias máximo
- Ordena por relevancia

**Ejemplo:**

```typescript
const suggestions = getSuggestions('/sal');
// Retorna: [
//   { shortcut: '/saludo', title: 'Saludo inicial', ... },
//   { shortcut: '/saludoformal', title: 'Saludo formal', ... }
// ]
```

#### `processInput(text: string): ProcessResult`

Procesa el input y determina si debe expandirse un atajo.

**Retorno:**

```typescript
interface ProcessResult {
  shouldExpand: boolean;
  content?: string;
  reply?: QuickReply;
}
```

**Ejemplo:**

```typescript
const result = processInput('/saludo');
if (result.shouldExpand) {
  setMessageInput(result.content);
}
```

#### `detectShortcut(text: string): DetectionResult`

Detecta si el texto coincide exactamente con un atajo.

**Retorno:**

```typescript
interface DetectionResult {
  detected: boolean;
  shortcut?: string;
  reply?: QuickReply;
}
```

#### `loadQuickReplies(): Promise<QuickReply[]>`

Recarga la lista de atajos desde la API.

#### `findByShortcut(shortcut: string): QuickReply | undefined`

Busca un atajo específico por su nombre.

### Estados del Hook

```typescript
{
  quickReplies: QuickReply[];  // Lista completa de atajos
  loading: boolean;            // Estado de carga
  error: string | null;        // Error si existe
}
```

## 🎨 Estilos: `ShortcutSuggestions.css`

### Clases Principales

#### `.shortcut-suggestions`

Contenedor principal de las sugerencias.

- Posición absoluta sobre el input
- Sombra y borde redondeado
- Animación de entrada desde abajo
- Z-index elevado para superposición

#### `.shortcut-suggestion`

Cada elemento de sugerencia individual.

- Hover effect suave
- Padding generoso para facilitar clic
- Transición de color de fondo

#### `.shortcut-suggestion--selected`

Sugerencia actualmente seleccionada.

- Fondo azul degradado
- Texto blanco
- Indicador visual claro

#### Responsive

- Ancho máximo de 500px
- Adaptación a pantallas móviles
- Scroll interno si hay muchas sugerencias

## 📄 Integración en `ChatPage.tsx`

### Estados Agregados

```typescript
const [suggestions, setSuggestions] = useState<QuickReply[]>([]);
const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
```

### Handlers Implementados

#### `handleInputChange(value: string)`

Actualiza el input y detecta atajos:

```typescript
const handleInputChange = (value: string) => {
  setMessageInput(value);

  if (value.startsWith('/')) {
    const matchingSuggestions = getSuggestions(value);
    setSuggestions(matchingSuggestions);
    setSelectedSuggestionIndex(0);
  } else {
    setSuggestions([]);
  }
};
```

#### `handleKeyDown(event: KeyboardEvent<HTMLInputElement>)`

Maneja la navegación por teclado:

```typescript
- ArrowDown: Mueve selección hacia abajo
- ArrowUp: Mueve selección hacia arriba
- Enter/Tab: Expande el atajo seleccionado
- Escape: Cierra las sugerencias
```

**Prevención de comportamiento por defecto:**

- `ArrowDown/ArrowUp`: Evita mover cursor en input
- `Tab`: Evita cambiar foco
- `Enter`: Evita enviar formulario si hay sugerencias

#### `expandShortcut(suggestion: QuickReply)`

Expande el atajo al contenido completo:

```typescript
const expandShortcut = (suggestion: QuickReply) => {
  setMessageInput(suggestion.content);
  setSuggestions([]);
  setSelectedSuggestionIndex(0);
};
```

#### `handleSuggestionSelect(suggestion: QuickReply)`

Callback cuando se hace clic en una sugerencia.

### Modificación del Formulario

**Antes:**

```tsx
<form className="chat-composer">
  <input ... />
  <button>Enviar</button>
</form>
```

**Después:**

```tsx
<form className="chat-composer">
  {suggestions.length > 0 && (
    <ShortcutSuggestions ... />
  )}
  <div className="chat-composer__input-row">
    <input
      onChange={(e) => handleInputChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Escribe un mensaje… (usa / para atajos)"
    />
    <button>Enviar</button>
  </div>
</form>
```

### Cambios en CSS Global

**Actualización de `.chat-composer`:**

```css
.chat-composer {
  flex-direction: column; /* Cambio de row a column */
  position: relative; /* Para posicionamiento absoluto de sugerencias */
}
```

**Nueva clase `.chat-composer__input-row`:**

```css
.chat-composer__input-row {
  display: flex;
  gap: 0.85rem;
  width: 100%;
}
```

## 🎯 Flujo de Interacción

### Flujo Normal

```
1. Usuario escribe '/'
   └─> handleInputChange detecta inicio de atajo
       └─> getSuggestions('/') retorna sugerencias
           └─> Renderiza ShortcutSuggestions

2. Usuario escribe '/sal'
   └─> handleInputChange actualiza
       └─> getSuggestions('/sal') filtra sugerencias
           └─> Actualiza lista de sugerencias

3. Usuario presiona ArrowDown
   └─> handleKeyDown incrementa selectedSuggestionIndex
       └─> Resalta visualmente siguiente sugerencia

4. Usuario presiona Enter
   └─> handleKeyDown llama expandShortcut()
       └─> setMessageInput con contenido completo
           └─> Cierra sugerencias

5. Usuario presiona Enviar
   └─> handleSubmitMessage envía mensaje
       └─> Resetea estados
```

### Flujo Alternativo (Escape)

```
1-3. (igual que flujo normal)

4. Usuario presiona Escape
   └─> handleKeyDown cierra sugerencias
       └─> setSuggestions([])
           └─> Mantiene texto original
```

### Flujo con Click

```
1-2. (igual que flujo normal)

3. Usuario hace click en sugerencia
   └─> handleSuggestionSelect()
       └─> Llama expandShortcut()
           └─> Expande contenido
```

## 🧪 Testing Manual

### Casos de Prueba

#### 1. ✅ Detección Básica

- Escribir `/saludo`
- Verificar que aparecen sugerencias
- Verificar que solo muestran atajos que empiezan con `/saludo`

#### 2. ✅ Navegación con Teclado

- Escribir `/`
- Presionar ↓ múltiples veces
- Verificar que la selección cambia visualmente
- Verificar que no pasa del último elemento

#### 3. ✅ Expansión con Enter

- Escribir `/saludo`
- Presionar Enter
- Verificar que el input contiene el contenido completo
- Verificar que las sugerencias desaparecen

#### 4. ✅ Expansión con Tab

- Escribir `/horarios`
- Presionar Tab
- Verificar expansión correcta

#### 5. ✅ Cancelación con Escape

- Escribir `/ubicacion`
- Presionar Escape
- Verificar que las sugerencias desaparecen
- Verificar que el texto original se mantiene

#### 6. ✅ Click en Sugerencia

- Escribir `/`
- Click en una sugerencia
- Verificar expansión correcta

#### 7. ✅ Sin Coincidencias

- Escribir `/noexiste`
- Verificar que no aparecen sugerencias

#### 8. ✅ Texto Sin Slash

- Escribir "Hola"
- Verificar que no aparecen sugerencias

## 🔒 Consideraciones de Seguridad

### ✅ Validación de Entrada

- El hook valida que el texto comience con `/`
- Filtrado case-insensitive evita problemas de mayúsculas

### ✅ Límite de Sugerencias

- Máximo 5 sugerencias para evitar saturación
- Mejora rendimiento en listas grandes

### ✅ Escape de Contenido

- El contenido se inserta directamente en el input
- No se renderiza como HTML (XSS protection)

## 📊 Métricas de Rendimiento

### Optimizaciones Implementadas

#### 1. useCallback en Hook

Todas las funciones usan `useCallback` para evitar re-renders innecesarios:

```typescript
const getSuggestions = useCallback(
  (text: string) => {
    // ...
  },
  [quickReplies]
);
```

#### 2. Filtrado Eficiente

- Usa `startsWith()` en lugar de regex complejos
- Limita a 5 resultados inmediatamente
- Filter + slice en una sola pasada

#### 3. Estado Local Mínimo

- Solo 2 estados adicionales en ChatPage
- Reseteo automático al enviar mensaje

#### 4. Renderizado Condicional

```typescript
{
  suggestions.length > 0 && <ShortcutSuggestions />;
}
```

Solo renderiza cuando hay sugerencias.

## 🚀 Próximas Mejoras

### Funcionalidades Pendientes

1. **Fuzzy Matching**

   - Permitir búsqueda aproximada
   - Ejemplo: `/salud` encuentra `/saludo`

2. **Atajos con Parámetros**

   - Ejemplo: `/presupuesto [producto] [precio]`
   - Completar parámetros después de expandir

3. **Categorías Visuales**

   - Agrupar por tipo (Saludos, Info, Soporte)
   - Iconos para cada categoría

4. **Historial de Uso**

   - Ordenar por atajos más usados
   - Sugerencias basadas en contexto

5. **Shortcuts Multilenguaje**

   - Soporte para múltiples idiomas
   - Cambio dinámico según configuración

6. **Preview del Contenido**
   - Mostrar vista previa del contenido completo
   - Tooltip al hover

## 📚 Referencias

### Archivos Relacionados

- `platform-backend/src/services/quick-reply.service.ts`: Servicio backend
- `platform-backend/src/routes/quick-replies.ts`: API endpoints
- `platform-backend/prisma/schema.prisma`: Modelo de base de datos
- `platform-frontend/QUICK-REPLIES-GUIDE.md`: Guía de usuario

### Dependencias

- React 18 con Hooks
- TypeScript 5.x
- Axios para llamadas API
- CSS Modules para estilos

---

**Desarrollado por:** GitHub Copilot  
**Fecha:** 2024  
**Versión:** 1.0.0

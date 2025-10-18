# 🚀 Guía de Respuestas Rápidas con Atajos

## ✨ Características Implementadas

### 1. **Detección Automática de Atajos**

El sistema detecta automáticamente cuando escribes un atajo que comienza con `/` en el campo de mensaje.

### 2. **Sugerencias Dinámicas**

Mientras escribes, aparece una lista de sugerencias que coinciden con tu texto:

- Máximo 5 sugerencias visibles
- Filtrado en tiempo real
- Resaltado visual del atajo y título

### 3. **Navegación con Teclado**

- **↓ (Flecha Abajo)**: Navegar a la siguiente sugerencia
- **↑ (Flecha Arriba)**: Navegar a la sugerencia anterior
- **Enter / Tab**: Expandir el atajo seleccionado
- **Escape**: Cerrar las sugerencias sin expandir

### 4. **Tres Niveles de Alcance**

- **Globales**: Disponibles para todos los usuarios
- **Por Área**: Específicas para un área de atención
- **Personales**: Únicas para cada usuario

## 🎯 Cómo Usar

### Paso 1: Escribir el Atajo

En el campo de mensaje, escribe `/` seguido del nombre del atajo:

```
/saludo
```

### Paso 2: Ver Sugerencias

Automáticamente aparecerá una lista de sugerencias que coincidan:

```
┌────────────────────────────────────┐
│ /saludo - Saludo inicial          │ ← Seleccionada
│ /saludoformal - Saludo formal     │
└────────────────────────────────────┘
```

### Paso 3: Seleccionar

- Usa las flechas ↑↓ para navegar
- Presiona **Enter** o **Tab** para expandir
- El texto completo reemplazará el atajo

### Paso 4: Enviar

El mensaje expandido está listo para enviar. Presiona **Enviar** cuando estés listo.

## 📝 Ejemplos de Atajos Disponibles

### Atajos de Saludo

- `/saludo` - Saludo inicial amigable
- `/saludoformal` - Saludo formal para clientes corporativos
- `/buenastardes` - Saludo para horario vespertino

### Atajos Informativos

- `/horarios` - Horario de atención
- `/ubicacion` - Dirección y cómo llegar
- `/envios` - Información sobre envíos

### Atajos de Soporte

- `/espera` - Mensaje de espera
- `/derivar` - Derivar a especialista
- `/nostock` - Producto sin stock

### Atajos de Despedida

- `/despedida` - Despedida estándar
- `/gracias` - Agradecimiento con despedida

## 🛠️ Gestión de Respuestas Rápidas

### Crear Nueva Respuesta Rápida

```typescript
// Usando el panel de Quick Replies (próximamente)
// O vía API:
POST /quick-replies
{
  "title": "Saludo inicial",
  "content": "¡Hola! Bienvenido a nuestro servicio...",
  "shortcut": "/saludo",
  "isGlobal": true
}
```

### Editar Respuesta Existente

- Las respuestas globales requieren permisos de administrador
- Las respuestas personales pueden ser editadas por su creador
- Las respuestas de área requieren pertenencia al área

## 💡 Consejos de Uso

### 1. **Atajos Cortos y Memorables**

Usa nombres cortos y fáciles de recordar:

- ✅ `/saludo`
- ✅ `/horarios`
- ❌ `/saludoparaclientesnuevos`

### 2. **Nomenclatura Consistente**

Mantén un patrón consistente:

- Saludos: `/saludo`, `/saludoformal`
- Info: `/horarios`, `/ubicacion`, `/envios`
- Soporte: `/espera`, `/derivar`

### 3. **Variables Personalizables**

- Usa `[OPERADOR]` o `{OPERADOR}` para insertar automáticamente tu nombre.
- Deja espacios para otros datos que necesites completar manualmente.

```
/saludo
→ "Buenos días/tardes. Gracias por contactarnos. Mi nombre es [OPERADOR] y estaré encantado/a de ayudarte."

/presupuesto
→ "Hola! El presupuesto para [PRODUCTO] es de $[MONTO]..."
```

Después de expandir, edita `[PRODUCTO]` y `[MONTO]` según necesites (el nombre del operador se rellena solo).

### 4. **Actualización Regular**

Revisa y actualiza tus atajos periódicamente para mantenerlos relevantes.

## 🔥 Beneficios

### ⚡ Velocidad

- Reduce el tiempo de respuesta en **60-70%**
- Respuestas instantáneas a preguntas frecuentes

### ✅ Consistencia

- Mensajes uniformes entre operadores
- Información siempre actualizada

### 🎨 Profesionalismo

- Respuestas bien redactadas
- Sin errores ortográficos

### 📊 Productividad

- Atiende más consultas simultáneas
- Menos fatiga por escritura repetitiva

## 🐛 Solución de Problemas

### No aparecen sugerencias

- Verifica que el atajo comience con `/`
- Asegúrate de que existan atajos que coincidan
- Revisa que estés autenticado correctamente

### El atajo no se expande

- Verifica que hayas presionado Enter o Tab
- Asegúrate de que la sugerencia esté seleccionada
- Comprueba que el contenido del atajo no esté vacío

### No veo mis atajos personales

- Verifica que hayas creado atajos con tu usuario
- Asegúrate de estar en el área correcta
- Comprueba los permisos de tu cuenta

## 🚀 Próximas Mejoras

- [ ] Modal de gestión completa de Quick Replies
- [ ] Búsqueda y filtrado avanzado
- [ ] Categorías de atajos
- [ ] Estadísticas de uso
- [ ] Variables dinámicas (nombre del cliente, hora, etc.)
- [ ] Compartir atajos entre áreas
- [ ] Importar/exportar atajos

---

**¿Necesitas ayuda?** Consulta con tu supervisor o administrador del sistema.

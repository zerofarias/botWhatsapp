# Variables Globales del Contacto - FlowBuilder

Las siguientes variables están disponibles **en TODOS los nodos** del FlowBuilder sin necesidad de crear nodos CAPTURE o SET_VARIABLE.

## Variables Disponibles

### 📱 Información de Contacto Base

| Variable               | Descripción                             | Ejemplo          |
| ---------------------- | --------------------------------------- | ---------------- |
| `$$GLOBAL_numTelefono` | Número de teléfono del contacto         | `549876543210`   |
| `$$GLOBAL_nombre`      | Nombre según el perfil de WhatsApp      | `Juan Pérez`     |
| `$$GLOBAL_email`       | Email del contacto (si está registrado) | `juan@email.com` |

### 📋 Información de Contacto Agendado

| Variable                  | Descripción                                         | Ejemplo               |
| ------------------------- | --------------------------------------------------- | --------------------- |
| `$$GLOBAL_nombreContacto` | Nombre del contacto en tu sistema (si fue agendado) | `Juan Pérez Agendado` |
| `$$GLOBAL_dni`            | DNI del contacto registrado                         | `12345678`            |

### 🏢 Información de Contexto

| Variable                      | Descripción                       | Ejemplo                       |
| ----------------------------- | --------------------------------- | ----------------------------- |
| `$$GLOBAL_areaId`             | ID del área/departamento asignado | `1`, `2`, `3`                 |
| `$$GLOBAL_conversationStatus` | Estado actual de la conversación  | `PENDING`, `ACTIVE`, `CLOSED` |

---

## Cómo Usar

### En nodos TEXT (mensajes):

```
Hola $$GLOBAL_nombre, tu teléfono registrado es $$GLOBAL_numTelefono
```

### En nodos CAPTURE (guardar respuesta):

```
Respuesta del usuario: $$GLOBAL_nombreContacto confirmó su compra
```

### En nodos CONDITIONAL (evaluar):

```
Si $$GLOBAL_dni = "12345678" entonces...
```

### En nodos SET_VARIABLE:

```
variable: contacto_phone
valor: $$GLOBAL_numTelefono
```

### En nodos DATA_LOG (guardar datos):

Se guardarán automáticamente todas las variables, incluyendo:

- `GLOBAL_numTelefono`
- `GLOBAL_nombre`
- `GLOBAL_nombreContacto`
- `GLOBAL_dni`
- Etc.

---

## Notas Importantes

✅ **Disponibles en TODOS los nodos** - No necesitas crearlas, ya existen

✅ **Actualizadas en tiempo real** - Se cargan del contexto de la conversación

✅ **Seguras** - Son de solo lectura desde el FlowBuilder

⚠️ **Pueden estar vacías** - Si el contacto no está registrado o es anónimo:

- `GLOBAL_nombreContacto` estará vacío
- `GLOBAL_dni` estará vacío
- `GLOBAL_email` estará vacío

💡 **Combínalas** - Puedes usar múltiples en un mismo nodo:

```
Confirmamos tu orden, $$GLOBAL_nombre. Te enviaremos detalles a $$GLOBAL_email
```

---

## Backend Integration (Próximo)

Estas variables se inyectarán automáticamente desde el `message.service.ts` cuando se ejecute el flujo en tiempo real.

Actualmente disponibles en:

- TEXT nodes
- CAPTURE nodes
- CONDITIONAL evaluations
- SET_VARIABLE assignments
- DATA_LOG captures

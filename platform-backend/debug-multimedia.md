# Diagnóstico de Problemas Multimedia

## Problema Reportado

Las imágenes y audios no se muestran en tiempo real en el chat.

## Posibles Causas

### 1. Problema con `downloadMedia()`

**Síntoma**: El backend no puede descargar el contenido multimedia de WhatsApp.

**Verificar**:

```bash
# Revisar logs del backend buscando:
[WPP] Processing image message
[WPP] Downloaded media, length: 0
[WPP] Error downloading media
```

**Solución**:

- Verificar versión de WPPConnect
- Verificar que el cliente esté correctamente conectado
- Puede requerir actualizar WPPConnect o usar método alternativo

### 2. Permisos de Escritura

**Síntoma**: El backend no puede escribir archivos en `/uploads`

**Verificar**:

```powershell
# Verificar permisos del directorio
Get-Acl C:\Users\lauth\OneDrive\Documentos\wppconnect\platform-backend\uploads

# Intentar crear archivo de prueba
New-Item -Path "C:\Users\lauth\OneDrive\Documentos\wppconnect\platform-backend\uploads\test.txt" -ItemType File -Force
```

**Solución**:

```powershell
# Dar permisos completos
icacls "C:\Users\lauth\OneDrive\Documentos\wppconnect\platform-backend\uploads" /grant Everyone:F
```

### 3. Rutas de Archivos Incorrectas

**Síntoma**: Los archivos se guardan pero no se sirven correctamente

**Verificar**:

- Revisar si existe el directorio `uploads/`
- Verificar que Express esté sirviendo archivos estáticos correctamente
- Probar acceder manualmente: `http://localhost:4000/uploads/2024-10/test.jpg`

**Solución**:

```typescript
// En app.ts, verificar:
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));
```

### 4. Socket.IO no Emite Correctamente

**Síntoma**: El mensaje se guarda pero no llega al frontend

**Verificar**:

```typescript
// Buscar en logs:
[WPP] Successfully processed image as image: /uploads/2024-10/...
```

**Solución**:
Verificar que el mensaje se emita con los campos correctos:

```typescript
{
  mediaUrl: "/uploads/2024-10/image-123.jpg",
  mediaType: "image",
  content: "imagen compartida"
}
```

### 5. Frontend no Renderiza Correctamente

**Síntoma**: El mensaje llega pero no se muestra

**Verificar**:

- Abrir DevTools del navegador
- Revisar Console para errores
- Revisar Network tab para ver si las imágenes cargan (404 errors)

## Plan de Acción

### Paso 1: Activar Logs Detallados

Modificar `wpp.service.ts` para agregar más logs:

```typescript
console.log('[WPP] Full message object:', JSON.stringify(message, null, 2));
console.log('[WPP] Message type:', messageAny.type);
console.log('[WPP] Has media:', messageAny.hasMedia);
console.log('[WPP] Media data length:', mediaData?.length);
```

### Paso 2: Verificar Conectividad

```bash
# Backend corriendo en: http://localhost:4000
# Frontend corriendo en: http://localhost:5173

# Probar acceso a archivos estáticos:
curl http://localhost:4000/uploads/test.txt
```

### Paso 3: Prueba Manual

Crear un archivo de prueba y verificar que se sirva:

```bash
cd platform-backend
mkdir -p uploads/2024-10
echo "test" > uploads/2024-10/test.txt

# Verificar acceso:
curl http://localhost:4000/uploads/2024-10/test.txt
```

### Paso 4: Verificar Base de Datos

```sql
-- Ver últimos mensajes con multimedia
SELECT id, content, mediaType, mediaUrl, createdAt
FROM messages
WHERE mediaType IS NOT NULL
ORDER BY createdAt DESC
LIMIT 10;
```

### Paso 5: Verificar que downloadMedia() Funciona

Crear script de prueba:

```typescript
// test-media.ts
import { create } from '@wppconnect-team/wppconnect';

const client = await create({
  session: 'test',
  headless: false,
});

client.onMessage(async (message) => {
  if (message.type === 'image') {
    try {
      const media = await client.downloadMedia(message);
      console.log('Media downloaded:', media.length);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }
});
```

## Workarounds Temporales

### Opción A: Usar Proxy de WhatsApp Web

Si `downloadMedia()` falla, usar el thumbnail:

```typescript
if (messageAny.thumbnail) {
  const processed = await processBase64Content(messageAny.thumbnail);
  // Usar thumbnail en lugar del media completo
}
```

### Opción B: Mostrar Base64 Directamente en Frontend

Ya implementado en `ChatPage.tsx`:

```typescript
// Frontend detecta base64 y lo muestra como data URL
if (isBase64Image(message.content)) {
  const imageUrl = `data:image/jpeg;base64,${message.content}`;
  return <img src={imageUrl} />;
}
```

### Opción C: Descargar Media Manualmente

Usar herramienta externa para descargar y guardar:

```typescript
// Usar fetch o axios para descargar desde URL de WhatsApp
const response = await fetch(messageAny.mediaUrl);
const buffer = await response.arrayBuffer();
// Guardar buffer
```

## Checklist de Verificación

- [ ] Backend está corriendo sin errores
- [ ] Frontend está corriendo sin errores
- [ ] Directorio `/uploads` existe y tiene permisos de escritura
- [ ] Express está sirviendo archivos estáticos correctamente
- [ ] `client.downloadMedia()` no lanza excepciones
- [ ] Los archivos se crean en `/uploads/YYYY-MM/`
- [ ] Los mensajes incluyen `mediaUrl` y `mediaType` en base de datos
- [ ] Socket.IO emite eventos `message:new` correctamente
- [ ] Frontend recibe los mensajes vía Socket.IO
- [ ] No hay errores 404 en Network tab del navegador
- [ ] El componente `MessageBubble` renderiza multimedia correctamente

## Información de Depuración a Recopilar

1. **Logs del backend** cuando llega un mensaje multimedia
2. **Contenido de la base de datos** para el último mensaje multimedia
3. **Contenido del directorio** `/uploads` después de enviar una imagen
4. **DevTools Console** del navegador cuando se recibe un mensaje
5. **DevTools Network** para verificar requests a `/uploads/*`
6. **Versión de WPPConnect** usada: `npm list @wppconnect-team/wppconnect`

## Siguiente Paso

Ejecutar el backend en modo desarrollo con logs máximos y enviar una imagen de prueba para ver exactamente dónde falla el proceso.

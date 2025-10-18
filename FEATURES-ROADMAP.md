# 🚀 Funcionalidades Sugeridas - Plan de Implementación

## 📋 Top 10 Funcionalidades Recomendadas (Por Prioridad)

### 1. ⚡ Quick Replies (Respuestas Rápidas)

**Impacto**: Alto | **Dificultad**: Baja | **Tiempo estimado**: 4-6 horas

**Descripción**: Pre-configurar mensajes comunes que los operadores pueden enviar con un click.

**Beneficios**:

- Reduce tiempo de respuesta en 60-70%
- Estandariza comunicación
- Mejora productividad de operadores

**Implementación**:

```typescript
// Backend: Nueva tabla QuickReply
model QuickReply {
  id        Int      @id @default(autoincrement())
  title     String   // "Saludo inicial"
  content   String   @db.Text // "Hola! ¿En qué puedo ayudarte?"
  shortcut  String?  // "/saludo"
  areaId    Int?
  userId    Int?
  isGlobal  Boolean  @default(false)
  createdAt DateTime @default(now())
}

// Frontend: Panel lateral con botones
<QuickReplyPanel>
  <button onClick={() => insertReply(reply.content)}>
    {reply.title}
  </button>
</QuickReplyPanel>
```

**Casos de uso**:

- Saludos iniciales
- Despedidas
- Información de horarios
- Políticas comunes
- Instrucciones paso a paso

---

### 2. 📊 Dashboard de Métricas en Tiempo Real

**Impacto**: Alto | **Dificultad**: Media | **Tiempo estimado**: 8-12 horas

**Descripción**: Panel con estadísticas actualizadas en tiempo real sobre conversaciones y operadores.

**Métricas clave**:

- Conversaciones activas vs cerradas (últimas 24h)
- Tiempo promedio de primera respuesta
- Tiempo promedio de resolución
- Operadores conectados y su carga
- Tasa de satisfacción (si se implementa)
- Distribución por área

**Implementación**:

```typescript
// Backend: Endpoints de analytics
GET / api / analytics / real - time;
GET / api / analytics / operator - performance;
GET / api / analytics / conversation - stats;

// Frontend: Componentes con gráficos
import { LineChart, BarChart, PieChart } from 'recharts';

<DashboardGrid>
  <MetricCard title="Activas" value={activeCount} />
  <MetricCard title="Tiempo Resp." value={avgResponseTime} />
  <LineChart data={hourlyStats} />
  <BarChart data={areaDistribution} />
</DashboardGrid>;
```

---

### 3. 🔍 Búsqueda de Mensajes

**Impacto**: Alto | **Dificultad**: Media | **Tiempo estimado**: 6-8 horas

**Descripción**: Buscar en el historial completo de conversaciones por contenido, contacto, fecha, etc.

**Características**:

- Búsqueda full-text en contenido de mensajes
- Filtros por fecha, contacto, operador, área
- Búsqueda por DNI
- Resultados con contexto (mensajes anteriores/posteriores)

**Implementación**:

```typescript
// Backend: Usar FULLTEXT index en MySQL
ALTER TABLE messages ADD FULLTEXT(content);

// Query optimizado
SELECT m.*, c.name, c.phone
FROM messages m
JOIN conversations conv ON m.conversationId = conv.id
JOIN contacts c ON conv.contactId = c.id
WHERE MATCH(m.content) AGAINST(? IN NATURAL LANGUAGE MODE)
  AND m.createdAt BETWEEN ? AND ?
ORDER BY m.createdAt DESC;

// Frontend: Barra de búsqueda global
<SearchBar>
  <input placeholder="Buscar en conversaciones..." />
  <SearchFilters>
    <DateRangePicker />
    <AreaSelector />
  </SearchFilters>
</SearchBar>
```

---

### 4. 🎤 Grabación de Audio Directa

**Impacto**: Medio-Alto | **Dificultad**: Media | **Tiempo estimado**: 6-8 horas

**Descripción**: Permitir a operadores grabar y enviar mensajes de voz desde el navegador.

**Tecnologías**:

- MediaRecorder API (navegador)
- Conversión a formato compatible con WhatsApp (Opus/OGG)
- Upload y procesamiento en backend

**Implementación**:

```typescript
// Frontend: Componente de grabación
const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    // ... lógica de grabación
  };

  return (
    <div>
      <button onClick={startRecording}>🎤 Grabar</button>
      {audioBlob && <button onClick={sendAudio}>Enviar</button>}
    </div>
  );
};

// Backend: Endpoint para recibir audio
POST /api/conversations/:id/send-audio
Content-Type: multipart/form-data

// Conversión y envío vía WPPConnect
await client.sendVoice(phoneNumber, audioBase64);
```

---

### 5. 📎 Adjuntar Archivos desde Computadora

**Impacto**: Alto | **Dificultad**: Baja | **Tiempo estimado**: 4-6 horas

**Descripción**: Permitir a operadores enviar documentos, imágenes, videos desde su PC.

**Características**:

- Drag & drop de archivos
- Preview de imágenes antes de enviar
- Validación de tamaño y tipo
- Conversión automática de formatos si es necesario

**Implementación**:

```typescript
// Frontend: Zona de drop
<DropZone onDrop={handleFileDrop}>
  <input type="file" accept="image/*,video/*,.pdf,.doc,.docx" />
</DropZone>

// Backend: Multer para upload
const upload = multer({
  dest: 'uploads/temp',
  limits: { fileSize: 16 * 1024 * 1024 } // 16MB
});

POST /api/conversations/:id/send-media
Content-Type: multipart/form-data

// Envío vía WPPConnect
await client.sendFile(phoneNumber, filePath, filename);
```

---

### 6. ✅ Estados de Lectura (Read Receipts)

**Impacto**: Medio | **Dificultad**: Media | **Tiempo estimado**: 6-8 horas

**Descripción**: Mostrar si el contacto recibió/leyó los mensajes (✓, ✓✓, ✓✓ azul).

**Estados**:

- ✓ Enviado (sent)
- ✓✓ Entregado (delivered)
- ✓✓ azul - Leído (read)

**Implementación**:

```typescript
// Backend: Escuchar eventos de WPPConnect
client.onAck(async (ack) => {
  // ack.ack: 1=enviado, 2=entregado, 3=leído
  await prisma.message.update({
    where: { externalId: ack.id._serialized },
    data: {
      deliveryStatus:
        ack.ack === 3 ? 'READ' : ack.ack === 2 ? 'DELIVERED' : 'SENT',
    },
  });

  // Emitir vía Socket.IO
  io.emit('message:status', { messageId, status: ack.ack });
});

// Frontend: Iconos de estado
const StatusIcon = ({ status }) => {
  if (status === 'READ') return <span className="text-blue-500">✓✓</span>;
  if (status === 'DELIVERED') return <span className="text-gray-500">✓✓</span>;
  return <span className="text-gray-400">✓</span>;
};
```

---

### 7. 💬 Indicador de "Escribiendo..."

**Impacto**: Medio | **Dificultad**: Media | **Tiempo estimado**: 4-6 horas

**Descripción**: Mostrar cuando el contacto está escribiendo un mensaje.

**Implementación**:

```typescript
// Backend: Escuchar evento
client.onPresenceChanged(async (presence) => {
  if (presence.state === 'composing') {
    io.to(`conversation:${conversationId}`).emit('contact:typing', {
      conversationId,
      isTyping: true,
    });
  }
});

// Frontend: Componente de typing indicator
{
  isContactTyping && (
    <div className="typing-indicator">
      <span>El contacto está escribiendo</span>
      <span className="dots">...</span>
    </div>
  );
}
```

---

### 8. 📝 Notas Internas

**Impacto**: Medio-Alto | **Dificultad**: Baja | **Tiempo estimado**: 4-6 horas

**Descripción**: Notas privadas visibles solo para operadores, no se envían al contacto.

**Características**:

- Se muestran en el historial con estilo diferenciado
- Solo visibles para operadores del área
- Útil para documentar contexto o pasar información entre turnos

**Implementación**:

```typescript
// Backend: Extender modelo Message
enum MessageSender {
  CONTACT
  OPERATOR
  BOT
  SYSTEM
  INTERNAL_NOTE  // <- Nuevo
}

// Frontend: Botón para agregar nota
<button onClick={addInternalNote}>
  📝 Agregar nota interna
</button>

// Renderizado diferenciado
{message.senderType === 'INTERNAL_NOTE' && (
  <div className="internal-note">
    <span className="icon">📝</span>
    <span className="content">{message.content}</span>
    <span className="author">{message.operatorName}</span>
  </div>
)}
```

---

### 9. 🔄 Transferir Conversación

**Impacto**: Alto | **Dificultad**: Media | **Tiempo estimado**: 6-8 horas

**Descripción**: Transferir conversaciones activas a otro operador o área.

**Características**:

- Transferencia directa a operador específico
- Transferencia a área (asignación automática)
- Mensaje opcional de contexto
- Notificación al operador receptor

**Implementación**:

```typescript
// Backend: Endpoint
POST /api/conversations/:id/transfer
{
  targetUserId?: number,
  targetAreaId?: number,
  note?: string
}

// Lógica de transferencia
async function transferConversation(
  conversationId: string,
  fromUserId: number,
  toUserId: number,
  note?: string
) {
  // 1. Actualizar conversation
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      assignedUserId: toUserId,
      areaId: targetAreaId
    }
  });

  // 2. Registrar evento
  await addConversationEvent(conversationId, {
    type: 'TRANSFERRED',
    fromUserId,
    toUserId,
    note
  });

  // 3. Notificar
  io.to(`user:${toUserId}`).emit('conversation:transferred', {
    conversationId,
    from: fromUser,
    note
  });
}

// Frontend: Modal de transferencia
<TransferModal>
  <OperatorSelector />
  <AreaSelector />
  <textarea placeholder="Nota para el nuevo operador..." />
  <button onClick={transfer}>Transferir</button>
</TransferModal>
```

---

### 10. 🏷️ Etiquetas de Conversación

**Impacto**: Medio | **Dificultad**: Baja | **Tiempo estimado**: 4-6 horas

**Descripción**: Etiquetar conversaciones para organización y análisis.

**Ejemplos de etiquetas**:

- Urgente
- Reclamo
- Consulta
- Soporte técnico
- Venta potencial
- Resuelta
- Pendiente

**Implementación**:

```typescript
// Backend: Nueva tabla
model Tag {
  id     Int    @id @default(autoincrement())
  name   String @unique
  color  String // #FF5733
  areaId Int?
}

model ConversationTag {
  conversationId String
  tagId          Int
  addedBy        Int
  createdAt      DateTime @default(now())

  @@id([conversationId, tagId])
}

// Frontend: Chips de etiquetas
<TagSelector>
  {tags.map(tag => (
    <Chip
      key={tag.id}
      color={tag.color}
      onClick={() => toggleTag(tag)}
    >
      {tag.name}
    </Chip>
  ))}
</TagSelector>

// Filtrado por etiquetas
<ConversationFilter>
  <TagFilter selectedTags={selectedTags} />
</ConversationFilter>
```

---

## 🎯 Roadmap Sugerido

### Sprint 1 (1-2 semanas) - Productividad Básica

- ✅ Quick Replies
- ✅ Adjuntar Archivos
- ✅ Notas Internas

### Sprint 2 (1-2 semanas) - Experiencia de Usuario

- ✅ Estados de Lectura
- ✅ Indicador de "Escribiendo..."
- ✅ Búsqueda de Mensajes

### Sprint 3 (1-2 semanas) - Colaboración

- ✅ Transferir Conversación
- ✅ Etiquetas
- ✅ Grabación de Audio

### Sprint 4 (2-3 semanas) - Analytics

- ✅ Dashboard de Métricas
- ✅ Reportes exportables
- ✅ Métricas de operadores

---

## 💡 Otras Ideas Innovadoras

### A. Sistema de Plantillas con Variables

```
Hola {{nombre}}, tu pedido {{numero_pedido}} está {{estado}}.
```

### B. Recordatorios Programados

Programar mensaje para enviar en fecha/hora específica.

### C. Chatbot con IA

Integración con GPT-4/Claude para respuestas automáticas inteligentes.

### D. Integración con CRM

Sincronizar contactos y conversaciones con Salesforce/HubSpot.

### E. Sistema de Tickets

Crear tickets en sistemas externos desde conversaciones.

### F. Video Llamadas

Permitir iniciar video llamadas desde el chat (usando WebRTC).

### G. Encuestas de Satisfacción

Enviar automáticamente al cerrar conversación.

### H. Multi-idioma

Detección automática de idioma y traducción.

---

## 🔧 Herramientas Recomendadas

- **Gráficos**: Recharts, Chart.js
- **Componentes UI**: Shadcn/ui, Radix UI
- **Formularios**: React Hook Form + Zod
- **Notificaciones**: React Hot Toast
- **Drag & Drop**: React DnD, dnd-kit
- **Audio**: RecordRTC, MediaRecorder API
- **Búsqueda**: MeiliSearch (alternativa a MySQL fulltext)
- **Analytics**: Plausible, PostHog

---

¿Cuál de estas funcionalidades te gustaría implementar primero?

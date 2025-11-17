# 🚀 Ideas de Mejora: Nodos Avanzados y Sistema de Monitoreo

## 📋 Tabla de Contenidos

1. [Nodos Avanzados](#nodos-avanzados)
2. [Sistema de Monitoreo y Alertas](#sistema-de-monitoreo-y-alertas)
3. [Arquitectura Técnica](#arquitectura-técnica)
4. [Plan de Implementación](#plan-de-implementación)

---

## 🔧 NODOS AVANZADOS

### 1. Nodo de Consulta a Base de Datos

#### Descripción

Permite al chatbot consultar datos directamente de una base de datos (MySQL, MongoDB, etc.) y usar esos datos para personalizar las respuestas.

#### Funcionalidades

```
┌─ Nodo Database Query
│  ├─ Selector de conexión (MySQL, MongoDB, PostgreSQL)
│  ├─ Constructor de SQL/Queries visual
│  ├─ Mapeo de variables de entrada
│  ├─ Transformación de resultados
│  ├─ Manejo de errores
│  └─ Cache opcional de resultados
```

#### Casos de Uso

- **Búsqueda de pedidos:** Usuario: "¿Dónde está mi pedido?" → Bot consulta DB con ID → Responde con estado
- **Información de clientes:** Usuario proporciona nombre → Bot busca datos en DB → Personaliza respuesta
- **Inventario:** Usuario: "¿Tienen en stock?" → Bot consulta disponibilidad en tiempo real

#### Flujo de Ejemplo

```
┌─ Entrada del usuario: "¿Cuál es el precio de producto XYZ?"
│
├─ Nodo Database Query
│  ├─ Consulta: SELECT precio FROM productos WHERE nombre = @productName
│  ├─ Parámetro: @productName = variable extraída del mensaje
│  └─ Resultado: { precio: 299.99, disponible: true }
│
├─ Nodo IA (opcional)
│  └─ Contexto: "El precio es $299.99 y está disponible"
│  └─ Respuesta: "El producto XYZ cuesta $299.99 y tenemos stock"
│
└─ Salida al usuario
```

#### Implementación Técnica (Frontend)

```typescript
// platform-frontend/src/components/flow-nodes/DatabaseNodeForm.tsx

interface DatabaseNode {
  id: string;
  type: 'database';
  data: {
    connectionId: string; // ID de conexión a DB
    queryType: 'sql' | 'mongodb';
    query: string; // SELECT * FROM users WHERE id = ?
    parameters: Array<{
      name: string; // @userId
      source: 'input' | 'variable' | 'context';
      value: string;
    }>;
    resultMapping: {
      [outputVar: string]: string; // mapeo de columnas a variables
    };
    errorHandling: {
      onError: 'retry' | 'fallback' | 'skip';
      retryCount?: number;
      fallbackMessage?: string;
    };
    cache?: {
      enabled: boolean;
      ttl: number; // segundos
      key: string; // clave de cache personalizada
    };
  };
}

// UI del nodo
export function DatabaseNodeForm() {
  return (
    <div className="node-form">
      <label>Conexión a Base de Datos</label>
      <select>
        <option>MySQL Local</option>
        <option>MongoDB Atlas</option>
        <option>PostgreSQL Remote</option>
      </select>

      <label>Tipo de Consulta</label>
      <select>
        <option>SQL</option>
        <option>MongoDB Query</option>
      </select>

      <label>Consulta</label>
      <textarea placeholder="SELECT * FROM users WHERE email = @email" />

      <label>Parámetros</label>
      <ParameterMapper />

      <label>Mapeo de Resultados</label>
      <ResultMapper />

      <label>Cache</label>
      <CacheSettings />
    </div>
  );
}
```

#### Implementación Técnica (Backend)

```typescript
// platform-backend/src/services/database-query.service.ts

import { Database } from 'better-sqlite3';
import { MongoClient } from 'mongodb';

export class DatabaseQueryService {
  private connections = new Map<string, any>();

  async executeQuery(nodeData: DatabaseNodeConfig) {
    const { connectionId, queryType, query, parameters } = nodeData;

    try {
      if (queryType === 'sql') {
        return await this.executeSQLQuery(connectionId, query, parameters);
      } else {
        return await this.executeMongoQuery(connectionId, query, parameters);
      }
    } catch (error) {
      return this.handleQueryError(error, nodeData.errorHandling);
    }
  }

  private async executeSQLQuery(
    connectionId: string,
    query: string,
    params: any[]
  ) {
    const connection = this.connections.get(connectionId);

    // Reemplazar @parametros con valores
    let finalQuery = query;
    const values: any[] = [];

    params.forEach((param) => {
      finalQuery = finalQuery.replace(`@${param.name}`, '?');
      values.push(param.value);
    });

    // Ejecutar consulta
    const result = connection.prepare(finalQuery).all(...values);

    return {
      success: true,
      data: result,
      rowCount: result.length,
    };
  }

  private async executeMongoQuery(
    connectionId: string,
    query: string,
    params: any[]
  ) {
    const db = this.connections.get(connectionId);
    const queryObj = JSON.parse(query);

    // Reemplazar parámetros
    const finalQuery = this.replaceParams(queryObj, params);

    const result = await db.collection('data').find(finalQuery).toArray();

    return {
      success: true,
      data: result,
      rowCount: result.length,
    };
  }
}
```

---

### 2. Nodo de Webhooks

#### Descripción

Permite enviar datos a servicios externos y recibir respuestas que se usan en el flujo del chatbot.

#### Funcionalidades

```
┌─ Nodo Webhook
│  ├─ URL del webhook
│  ├─ Método HTTP (GET, POST, PUT)
│  ├─ Headers personalizados
│  ├─ Body (JSON/Form-data)
│  ├─ Autenticación (API Key, Bearer, Basic)
│  ├─ Transformación de respuesta
│  ├─ Reintentos con backoff exponencial
│  └─ Timeout configurable
```

#### Casos de Uso

- **Integración con CRM:** Enviar datos del cliente a Salesforce/HubSpot
- **Pagos:** Verificar estado de pago en pasarela de pagos
- **Notificaciones:** Enviar emails/SMS vía Twilio, SendGrid
- **Crear tickets:** Integración con Jira, Zendesk
- **Analytics:** Enviar eventos a Google Analytics, Segment

#### Flujo de Ejemplo

```
┌─ Usuario: "Quiero reservar una cancha"
│
├─ Nodo IA: Extrae fecha, hora, deporte
│
├─ Nodo Webhook
│  ├─ URL: https://reservas.miapp.com/api/disponibilidad
│  ├─ Método: POST
│  ├─ Body: {
│  │   "deporte": "futbol",
│  │   "fecha": "2025-11-20",
│  │   "hora": "18:00"
│  │ }
│  └─ Respuesta: {
│      "disponible": true,
│      "precio": 150,
│      "reservaId": "RES123"
│    }
│
├─ Nodo IA
│  └─ "La cancha está disponible a las 18:00 por $150"
│
└─ Guardar en variable: @reservaId, @precio
```

#### Implementación Técnica (Frontend)

```typescript
// platform-frontend/src/components/flow-nodes/WebhookNodeForm.tsx

interface WebhookNode {
  id: string;
  type: 'webhook';
  data: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers: Record<string, string>;
    auth: {
      type: 'none' | 'apikey' | 'bearer' | 'basic';
      apiKey?: string;
      token?: string;
      username?: string;
      password?: string;
    };
    body: {
      type: 'json' | 'formdata';
      content: Record<string, any>;
    };
    responseMapping: {
      [outputVar: string]: string; // JSONPath a variable
    };
    retry: {
      maxAttempts: number;
      backoffMultiplier: number;
      timeout: number; // ms
    };
    onError: {
      strategy: 'skip' | 'fallback' | 'fail';
      fallbackValue?: any;
    };
  };
}

export function WebhookNodeForm() {
  return (
    <div className="node-form">
      <label>URL</label>
      <input placeholder="https://api.ejemplo.com/endpoint" />

      <label>Método HTTP</label>
      <select>
        <option>GET</option>
        <option>POST</option>
        <option>PUT</option>
        <option>DELETE</option>
      </select>

      <label>Autenticación</label>
      <AuthenticationSelector />

      <label>Headers Personalizados</label>
      <KeyValueEditor />

      <label>Body (JSON)</label>
      <textarea placeholder='{"email": "@email", "nombre": "@nombre"}' />

      <label>Mapeo de Respuesta (JSONPath)</label>
      <JSONPathMapper />

      <label>Reintentos</label>
      <RetrySetting />

      <label>Manejo de Errores</label>
      <ErrorHandlingSelector />
    </div>
  );
}
```

#### Implementación Técnica (Backend)

```typescript
// platform-backend/src/services/webhook.service.ts

import axios, { AxiosError } from 'axios';

export class WebhookService {
  async callWebhook(
    nodeData: WebhookNodeConfig,
    variables: Record<string, any>
  ) {
    const { url, method, headers, auth, body, retry } = nodeData;

    // Construir headers
    const finalHeaders = {
      ...headers,
      ...this.getAuthHeaders(auth),
    };

    // Reemplazar variables en body
    const finalBody = this.replaceVariables(body.content, variables);

    // Intentar llamar al webhook con reintentos
    for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
      try {
        const response = await axios({
          method,
          url,
          headers: finalHeaders,
          data: method !== 'GET' ? finalBody : undefined,
          timeout: retry.timeout,
        });

        return {
          success: true,
          statusCode: response.status,
          data: response.data,
        };
      } catch (error) {
        if (attempt === retry.maxAttempts) {
          throw error;
        }

        // Backoff exponencial
        const delay = Math.pow(retry.backoffMultiplier, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private getAuthHeaders(auth: any): Record<string, string> {
    switch (auth.type) {
      case 'apikey':
        return { 'X-API-Key': auth.apiKey };
      case 'bearer':
        return { Authorization: `Bearer ${auth.token}` };
      case 'basic':
        const credentials = Buffer.from(
          `${auth.username}:${auth.password}`
        ).toString('base64');
        return { Authorization: `Basic ${credentials}` };
      default:
        return {};
    }
  }
}
```

---

### 3. Nodo de Cálculos / Transformaciones

#### Descripción

Realiza operaciones matemáticas, transformaciones de datos y lógica personalizada.

#### Funcionalidades

```
┌─ Nodo Calculation
│  ├─ Operaciones matemáticas (suma, resta, multiplicación)
│  ├─ Funciones avanzadas (round, floor, ceil, abs)
│  ├─ Manipulación de strings (concat, substring, uppercase)
│  ├─ Lógica condicional (if/else)
│  ├─ Iteraciones (map, filter, reduce)
│  └─ Expresiones personalizadas (JavaScript seguro)
```

#### Casos de Uso

- **Cálculo de precios:** Precio base + IVA + descuento = Precio final
- **Formateo:** Convertir fecha "2025-11-20" → "20 de noviembre"
- **Validación:** Verificar si email es válido, teléfono tiene formato correcto
- **Concatenación:** Combinar nombre + apellido → "Juan Pérez"
- **Conversiones:** USD a EUR usando tasa de cambio

#### Flujo de Ejemplo

```
┌─ Variables disponibles:
│  @precioBase = 100
│  @cantidad = 3
│  @descuento = 10
│
├─ Nodo Calculation
│  ├─ Expresión: (@precioBase * @cantidad) * (1 - @descuento/100)
│  └─ Resultado: @precioFinal = 270
│
├─ Nodo Calculation (Formateo)
│  ├─ Expresión: `Tu compra es de $${@precioFinal.toFixed(2)}`
│  └─ Resultado: @mensajePrecio = "Tu compra es de $270.00"
│
└─ Respuesta: "Tu compra es de $270.00"
```

#### Implementación Técnica (Frontend)

```typescript
// platform-frontend/src/components/flow-nodes/CalculationNodeForm.tsx

interface CalculationNode {
  id: string;
  type: 'calculation';
  data: {
    operations: Array<{
      name: string; // @precioFinal
      expression: string; // (@precioBase * @cantidad) * (1 - @descuento/100)
      description?: string;
    }>;
    functions: {
      math: boolean; // Math.round, Math.floor, etc.
      string: boolean; // concat, substring, etc.
      date: boolean; // Date operations
      custom: string[]; // Funciones personalizadas
    };
    validation: {
      checkTypes: boolean; // Validar tipos de dato
      errorHandling: 'skip' | 'fail';
    };
  };
}

export function CalculationNodeForm() {
  return (
    <div className="node-form">
      <label>Operaciones</label>
      <OperationsList />
      <label>Expresión</label>
      <ExpressionEditor />
      <span>Disponibles: @variable, Math functions, String methods</span>
      <label>Funciones Personalizadas</label>
      <CustomFunctionEditor />
      <label>Validación de Tipos</label>
      <input type="checkbox" /> Validar tipos de dato
    </div>
  );
}
```

#### Implementación Técnica (Backend)

```typescript
// platform-backend/src/services/calculation.service.ts

import { VM } from 'vm2'; // Usar VM2 para ejecutar JavaScript seguro

export class CalculationService {
  async calculate(
    nodeData: CalculationNodeConfig,
    variables: Record<string, any>
  ) {
    const results = {};

    for (const operation of nodeData.operations) {
      try {
        // Crear contexto seguro para la expresión
        const sandbox = {
          ...variables,
          Math: Math,
          Date: Date,
          String: String,
          JSON: JSON,
          ...this.getCustomFunctions(nodeData.functions.custom),
        };

        // Ejecutar expresión en VM segura
        const vm = new VM({ sandbox });
        const result = vm.run(operation.expression);

        results[operation.name] = result;
      } catch (error) {
        if (nodeData.validation.errorHandling === 'fail') {
          throw error;
        }
        results[operation.name] = null;
      }
    }

    return results;
  }

  private getCustomFunctions(customFunctions: string[]) {
    return {
      // Ejemplo: función para redondear a 2 decimales
      formatPrice: (price: number) => parseFloat(price.toFixed(2)),

      // Ejemplo: función para formatear fecha
      formatDate: (date: string) => new Date(date).toLocaleDateString('es-AR'),

      // Ejemplo: validación de email
      isValidEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    };
  }
}
```

---

### 4. Nodo de Traducción

#### Descripción

Traduce mensajes a diferentes idiomas usando servicios como Google Translate, DeepL, etc.

#### Funcionalidades

```
┌─ Nodo Translation
│  ├─ Idioma de origen (auto-detect o específico)
│  ├─ Idioma de destino
│  ├─ Proveedor (Google, DeepL, OpenAI)
│  ├─ Niveles de calidad (fast/standard/high)
│  ├─ Contexto (formal, informal, técnico)
│  └─ Cache de traducciones
```

#### Casos de Uso

- **Soporte multiidioma:** Usuario español habla con bot en inglés → Respuestas traducidas
- **Reportes internacionales:** Traducir resúmenes a múltiples idiomas
- **Marketing:** Personalizar mensajes por región

#### Flujo de Ejemplo

```
┌─ Usuario en idioma desconocido: "Hello, I need help"
│
├─ Nodo Translation (Detección automática)
│  ├─ Detecta: English
│  └─ Traduce a Español: "Hola, necesito ayuda"
│
├─ Flujo normal del chatbot (en español)
│
├─ Respuesta en español: "Claro, ¿en qué te puedo ayudar?"
│
├─ Nodo Translation (Traducción inversa)
│  └─ Traduce a English: "Sure, how can I help you?"
│
└─ Envía respuesta al usuario en su idioma original
```

---

### 5. Nodo de Personalización de Horarios

#### Descripción

Controla el flujo según horarios, días de la semana, zonas horarias, etc.

#### Funcionalidades

```
┌─ Nodo Schedule
│  ├─ Horarios específicos (9:00 AM - 5:00 PM)
│  ├─ Días de la semana (Lun-Vie)
│  ├─ Zonas horarias (Argentina, USA, EU)
│  ├─ Períodos especiales (vacaciones, festivos)
│  ├─ Acciones alternativas (derivar a agente, mensaje automatizado)
│  └─ Configuración por regla
```

#### Casos de Uso

- **Horario comercial:** Diferentes respuestas dentro/fuera de horario
- **Atención personalizada:** En horario: IA → Fuera horario: Cola para agente
- **Descuentos temporales:** Oferta válida solo viernes-domingo
- **Cierre de tienda:** Mensaje "Abierto en horario..." fuera de horario

#### Flujo de Ejemplo

```
┌─ Usuario solicita: "¿Pueden ayudarme?"
│
├─ Nodo Schedule
│  ├─ Zona horaria: America/Argentina/Buenos_Aires
│  ├─ Horario comercial: 9:00 - 17:00
│  ├─ Día actual: Miércoles (dentro de horario)
│  └─ Resultado: OPEN
│
├─ SI OPEN:
│  └─ Flujo normal, conectar con IA
│
└─ SI CLOSED:
   ├─ Mostrar horarios disponibles
   ├─ Opción: "¿Quieres dejar tu mensaje para mañana?"
   └─ Guardar en cola
```

#### Implementación Técnica (Frontend)

```typescript
// platform-frontend/src/components/flow-nodes/ScheduleNodeForm.tsx

interface ScheduleNode {
  id: string;
  type: 'schedule';
  data: {
    timezone: string; // 'America/Argentina/Buenos_Aires'
    schedules: Array<{
      name: string; // 'Horario comercial'
      daysOfWeek: number[]; // 0-6 (Domingo-Sábado)
      startTime: string; // '09:00'
      endTime: string; // '17:00'
      active: boolean;
    }>;
    specialDates: Array<{
      date: string; // '2025-12-25'
      name: string; // 'Navidad'
      action: 'closed' | 'reduced';
      message?: string;
    }>;
    branches: {
      onOpen: string; // ID del nodo siguiente si está abierto
      onClosed: string; // ID del nodo siguiente si está cerrado
      onReduced?: string; // Horario reducido
    };
  };
}

export function ScheduleNodeForm() {
  return (
    <div className="node-form">
      <label>Zona Horaria</label>
      <select>
        <option>America/Argentina/Buenos_Aires</option>
        <option>America/New_York</option>
        <option>Europe/Madrid</option>
      </select>

      <label>Horarios</label>
      <ScheduleTable />

      <label>Fechas Especiales</label>
      <SpecialDatesTable />

      <label>Ramificaciones</label>
      <BranchSelector />
    </div>
  );
}
```

#### Implementación Técnica (Backend)

```typescript
// platform-backend/src/services/schedule.service.ts

import * as tzdata from 'tzdata';

export class ScheduleService {
  isOpen(nodeData: ScheduleNodeConfig): 'open' | 'closed' | 'reduced' {
    const now = this.getTimeInTimezone(nodeData.timezone);

    // Verificar fechas especiales
    const specialStatus = this.checkSpecialDates(now, nodeData.specialDates);
    if (specialStatus) return specialStatus;

    // Verificar horarios regulares
    for (const schedule of nodeData.schedules) {
      if (!schedule.active) continue;

      const dayOfWeek = now.getDay();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      const isCorrectDay = schedule.daysOfWeek.includes(dayOfWeek);
      const isWithinTime =
        timeStr >= schedule.startTime && timeStr <= schedule.endTime;

      if (isCorrectDay && isWithinTime) return 'open';
    }

    return 'closed';
  }

  private getTimeInTimezone(timezone: string): Date {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const parts = formatter.formatToParts(new Date());
    const dateString = parts.map((part) => part.value).join('');

    return new Date(dateString);
  }
}
```

---

## 📊 SISTEMA DE MONITOREO Y ALERTAS

### 1. Dashboard de Métricas

#### Indicadores Principales

```
┌─ METRICS DASHBOARD
│
├─ 📞 Conversaciones
│  ├─ Total hoy: 124
│  ├─ Promedio por hora: 15.5
│  ├─ Conversaciones activas: 8
│  └─ Tasa de cierre: 87%
│
├─ ⏱️ Tiempos de Atención
│  ├─ Promedio: 4m 32s
│  ├─ Mediana: 3m 45s
│  ├─ Máximo: 25m 10s
│  └─ Mínimo: 45s
│
├─ ❌ Errores y Excepciones
│  ├─ Errores hoy: 12
│  ├─ Tasa de error: 0.8%
│  ├─ Últimos 5 errores
│  └─ Gravedad: 🟡 Media
│
├─ 🤖 Performance de IA
│  ├─ Precisión: 92.3%
│  ├─ Confianza promedio: 78%
│  ├─ Fallbacks usados: 3
│  └─ Mensajes sin salida: 2
│
└─ 👥 Flujos por Usuario
   ├─ Usuarios únicos: 342
   ├─ Usuario más activo: 18 mensajes
   ├─ Tiempo promedio: 5m 20s
   └─ Tasa de retorno: 64%
```

#### Visualizaciones

```
Gráfico 1: Conversaciones por Hora
─────────────────────────────────
25 │                    ▄█
20 │    ▄█    ▄█    ▄█ ██ ▄█
15 │ ▄█ ██ ▄█ ██ ▄█ ██ ██ ██
10 │ ██ ██ ██ ██ ██ ██ ██ ██
 5 │ ██ ██ ██ ██ ██ ██ ██ ██
   └──────────────────────────
     09  10  11  12  13  14  15

Gráfico 2: Distribución de Tiempos
──────────────────────────────────
< 1 min:     ▓▓▓▓░░░░░░░░░░░░░░░░░  15%
1-3 min:     ▓▓▓▓▓▓▓▓░░░░░░░░░░░░  32%
3-5 min:     ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░  35%
5-10 min:    ▓▓▓▓░░░░░░░░░░░░░░░░  12%
> 10 min:    ▓░░░░░░░░░░░░░░░░░░░   6%

Gráfico 3: Tasa de Errores (Últimos 7 días)
───────────────────────────────────────────
Lun: 0.5%
Mar: 0.8% ← HOY
Mié: 1.2% ⚠️
Jue: 0.3%
Vie: 0.9%
Sab: 1.8% ⚠️
Dom: 0.4%
```

#### Estructura de Datos

```typescript
// platform-backend/src/types/metrics.ts

interface ConversationMetrics {
  conversationId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // en ms
  messageCount: number;
  status: 'completed' | 'abandoned' | 'escalated';
  flowPath: string[]; // Nodos visitados
  errors: ErrorLog[];
  aiResponses: AIResponseMetric[];
}

interface AIResponseMetric {
  nodeId: string;
  query: string;
  response: string;
  confidence: number; // 0-1
  latency: number; // ms
  fallbackUsed: boolean;
  successfulIntent: boolean;
}

interface ErrorLog {
  timestamp: Date;
  nodeId: string;
  errorType: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: any;
}

interface SystemMetrics {
  timestamp: Date;
  memoryUsage: number; // MB
  cpuUsage: number; // %
  responseTime: number; // ms
  activeConnections: number;
  requestsPerSecond: number;
}
```

### 2. Sistema de Alertas

#### Tipos de Alertas

```
┌─ ALERT SYSTEM
│
├─ 🔴 CRÍTICAS
│  ├─ Error rate > 5%
│  ├─ Servidor caído
│  ├─ Base de datos sin respuesta
│  └─ API keys expiradas
│
├─ 🟠 ALTAS
│  ├─ Tiempo promedio respuesta > 5s
│  ├─ Rama sin salida detectada
│  ├─ Confianza de IA < 50%
│  └─ Memoria > 80%
│
├─ 🟡 MEDIAS
│  ├─ Error rate > 2%
│  ├─ Conversación abandonada
│  ├─ Webhook timeout
│  └─ CPU > 70%
│
└─ 🔵 BAJAS
   ├─ Tráfico inusual (20% diferencia)
   ├─ Sin conversaciones en 30 min
   └─ Caché lleno > 90%
```

#### Detección de Ramas sin Salida

```
┌─ RAMA SIN SALIDA DETECTION
│
├─ Node 1 (IA) ✓
│  ├─ Tiene salida: YES -> Node 2
│  └─ Tiene salida: NO -> Node 3
│
├─ Node 2 (DB Query) ✓
│  ├─ Tiene salida: ALWAYS -> Node 4
│  └─ Tiene salida: ERROR -> Node 5
│
├─ Node 3 (Webhook) ✗ PROBLEMA
│  ├─ Tiene salida: Success -> Node 4
│  ├─ Tiene salida: Timeout -> Node 5
│  └─ Tiene salida: No response -> ❌ SIN SALIDA
│         ALERTA: "Node 3 no tiene manejo para 'No response'"
│
├─ Node 4 (Response) ✓
│  └─ Terminal (sin necesidad de salida)
│
└─ Node 5 (Error Handler) ✓
   └─ Terminal
```

#### Implementación de Alertas (Backend)

```typescript
// platform-backend/src/services/alerts.service.ts

export class AlertService {
  private alertRules = [
    {
      name: 'error_rate_critical',
      condition: (metrics) => metrics.errorRate > 0.05,
      severity: 'critical',
      message: `Error rate es ${metrics.errorRate * 100}%`,
      actions: ['notify_admin', 'log_event', 'create_incident'],
    },
    {
      name: 'slow_response_time',
      condition: (metrics) => metrics.avgResponseTime > 5000,
      severity: 'high',
      message: `Tiempo promedio de respuesta: ${metrics.avgResponseTime}ms`,
      actions: ['notify_admin', 'scale_resources'],
    },
    {
      name: 'branch_without_exit',
      condition: (flow) => this.hasBranchWithoutExit(flow),
      severity: 'high',
      message: `Flow tiene rama sin salida: ${flow.problematicNodeId}`,
      actions: ['notify_developer', 'highlight_in_editor'],
    },
    {
      name: 'low_ai_confidence',
      condition: (metrics) => metrics.avgAiConfidence < 0.5,
      severity: 'medium',
      message: `Confianza de IA muy baja: ${metrics.avgAiConfidence}`,
      actions: ['notify_admin', 'suggest_retraining'],
    },
  ];

  async checkAlerts(metrics: any) {
    const triggeredAlerts = [];

    for (const rule of this.alertRules) {
      if (rule.condition(metrics)) {
        triggeredAlerts.push({
          rule: rule.name,
          severity: rule.severity,
          message: rule.message,
          timestamp: new Date(),
          actions: rule.actions,
        });

        // Ejecutar acciones
        await this.executeActions(rule.actions, rule.message);
      }
    }

    return triggeredAlerts;
  }

  private hasBranchWithoutExit(flow: FlowNode[]): boolean {
    for (const node of flow) {
      if (!node.exits || node.exits.length === 0) {
        // Revisar si es un nodo terminal válido
        if (!['response', 'end', 'escalate'].includes(node.type)) {
          return true;
        }
      }
    }
    return false;
  }

  private async executeActions(actions: string[], message: string) {
    for (const action of actions) {
      switch (action) {
        case 'notify_admin':
          await this.sendSlackNotification(message, 'admin');
          break;
        case 'log_event':
          console.log(`[ALERT] ${message}`);
          break;
        case 'create_incident':
          await this.createIncidentInJira(message);
          break;
        case 'notify_developer':
          await this.sendSlackNotification(message, 'developers');
          break;
      }
    }
  }
}
```

### 3. Panel de Control Interactivo

#### Componentes del Frontend

```typescript
// platform-frontend/src/pages/MonitoringDashboard.tsx

export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<Metrics>();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedFlow, setSelectedFlow] = useState<string>();

  return (
    <div className="monitoring-dashboard">
      {/* Controles */}
      <div className="controls">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        <FlowSelector value={selectedFlow} onChange={setSelectedFlow} />
        <RefreshButton />
      </div>

      {/* Cards principales */}
      <div className="metrics-grid">
        <MetricCard
          title="Conversaciones Hoy"
          value={metrics?.conversationCount}
          trend={metrics?.conversationTrend}
          icon="📞"
        />
        <MetricCard
          title="Tiempo Promedio"
          value={`${metrics?.avgDuration}m`}
          trend={metrics?.durationTrend}
          icon="⏱️"
        />
        <MetricCard
          title="Tasa de Error"
          value={`${metrics?.errorRate}%`}
          trend={metrics?.errorTrend}
          status={metrics?.errorRate > 5 ? 'critical' : 'normal'}
          icon="❌"
        />
        <MetricCard
          title="Precisión de IA"
          value={`${metrics?.aiAccuracy}%`}
          trend={metrics?.aiAccuracyTrend}
          icon="🤖"
        />
      </div>

      {/* Gráficos */}
      <div className="charts-grid">
        <ConversationChart data={metrics?.conversationsByHour} />
        <ResponseTimeChart data={metrics?.responseTimeDistribution} />
        <ErrorRateChart data={metrics?.errorRateTrend} />
        <FlowPathSankey data={metrics?.userFlowPaths} />
      </div>

      {/* Alertas */}
      <AlertsPanel alerts={alerts} onDismiss={handleDismissAlert} />

      {/* Tabla de detalles */}
      <RecentConversationsTable data={metrics?.recentConversations} />
    </div>
  );
}
```

### 4. Validación de Flujos

#### Validador Automático

```typescript
// platform-backend/src/services/flow-validator.service.ts

export class FlowValidatorService {
  validateFlow(flow: FlowNode[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Verificar nodos sin salida
    for (const node of flow) {
      if (!this.hasValidExit(node, flow)) {
        errors.push({
          nodeId: node.id,
          type: 'NO_EXIT',
          message: `Nodo ${node.id} no tiene una salida definida`,
          severity: 'error',
        });
      }
    }

    // 2. Verificar nodos inalcanzables
    const reachableNodes = this.getReachableNodes(flow);
    for (const node of flow) {
      if (!reachableNodes.includes(node.id)) {
        warnings.push({
          nodeId: node.id,
          type: 'UNREACHABLE',
          message: `Nodo ${node.id} es inalcanzable`,
          severity: 'warning',
        });
      }
    }

    // 3. Verificar ciclos infinitos
    const hasCycles = this.detectCycles(flow);
    if (hasCycles) {
      warnings.push({
        nodeId: null,
        type: 'CYCLE_DETECTED',
        message:
          'El flujo tiene ciclos potenciales que podrían crear loops infinitos',
        severity: 'warning',
      });
    }

    // 4. Verificar variables no definidas
    for (const node of flow) {
      const usedVars = this.extractVariables(node);
      for (const varName of usedVars) {
        if (!this.isVariableDefined(varName, flow, node)) {
          warnings.push({
            nodeId: node.id,
            type: 'UNDEFINED_VARIABLE',
            message: `Variable ${varName} no está definida antes de usarse`,
            severity: 'warning',
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private hasValidExit(node: FlowNode, flow: FlowNode[]): boolean {
    // Nodos terminales no necesitan salida
    if (['response', 'end', 'escalate'].includes(node.type)) {
      return true;
    }

    // Verificar que todas las posibles salidas están definidas
    if (node.type === 'webhook') {
      return (
        node.exits?.some((exit) => exit.condition === 'success') &&
        node.exits?.some((exit) => exit.condition === 'error')
      );
    }

    if (node.type === 'schedule') {
      return (
        node.exits?.some((exit) => exit.condition === 'open') &&
        node.exits?.some((exit) => exit.condition === 'closed')
      );
    }

    // Por defecto, debe tener al menos una salida
    return node.exits && node.exits.length > 0;
  }

  private detectCycles(flow: FlowNode[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = flow.find((n) => n.id === nodeId);
      if (node?.exits) {
        for (const exit of node.exits) {
          const nextNodeId = exit.targetNodeId;
          if (!visited.has(nextNodeId)) {
            if (hasCycle(nextNodeId)) return true;
          } else if (recursionStack.has(nextNodeId)) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of flow) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) return true;
      }
    }

    return false;
  }
}
```

---

## 🏗️ ARQUITECTURA TÉCNICA

### Estructura de Carpetas Sugerida

```
platform-backend/
├── src/
│  ├── services/
│  │  ├── nodes/
│  │  │  ├── database-query.service.ts    [NUEVO]
│  │  │  ├── webhook.service.ts           [NUEVO]
│  │  │  ├── calculation.service.ts       [NUEVO]
│  │  │  ├── translation.service.ts       [NUEVO]
│  │  │  └── schedule.service.ts          [NUEVO]
│  │  ├── monitoring/
│  │  │  ├── metrics.service.ts           [NUEVO]
│  │  │  ├── alerts.service.ts            [NUEVO]
│  │  │  └── flow-validator.service.ts    [NUEVO]
│  │  └── ...existing services
│  ├── controllers/
│  │  ├── monitoring.controller.ts        [NUEVO]
│  │  ├── alerts.controller.ts            [NUEVO]
│  │  └── ...existing controllers
│  ├── routes/
│  │  ├── monitoring.ts                   [NUEVO]
│  │  ├── alerts.ts                       [NUEVO]
│  │  └── ...existing routes
│  └── types/
│     ├── nodes.ts                        [ACTUALIZAR]
│     ├── metrics.ts                      [NUEVO]
│     └── ...existing types

platform-frontend/
├── src/
│  ├── components/
│  │  ├── flow-nodes/
│  │  │  ├── DatabaseNodeForm.tsx         [NUEVO]
│  │  │  ├── WebhookNodeForm.tsx          [NUEVO]
│  │  │  ├── CalculationNodeForm.tsx      [NUEVO]
│  │  │  ├── TranslationNodeForm.tsx      [NUEVO]
│  │  │  ├── ScheduleNodeForm.tsx         [NUEVO]
│  │  │  └── ...existing nodes
│  │  └── monitoring/
│  │     ├── MetricsCard.tsx              [NUEVO]
│  │     ├── AlertsPanel.tsx              [NUEVO]
│  │     ├── ConversationChart.tsx        [NUEVO]
│  │     ├── ErrorRateChart.tsx           [NUEVO]
│  │     └── FlowPathVisualization.tsx    [NUEVO]
│  ├── pages/
│  │  ├── MonitoringDashboard.tsx         [NUEVO]
│  │  ├── AlertsPage.tsx                  [NUEVO]
│  │  └── ...existing pages
│  ├── services/
│  │  ├── monitoring.service.ts           [NUEVO]
│  │  ├── flow-validator.service.ts       [NUEVO]
│  │  └── ...existing services
│  └── types/
│     ├── node-types.ts                   [ACTUALIZAR]
│     ├── metrics.ts                      [NUEVO]
│     └── ...existing types
```

### Base de Datos - Nuevas Tablas

```sql
-- Métricas de conversaciones
CREATE TABLE conversation_metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id VARCHAR(255),
  user_id VARCHAR(255),
  start_time DATETIME,
  end_time DATETIME,
  duration INT,
  message_count INT,
  status ENUM('completed', 'abandoned', 'escalated'),
  flow_path JSON,
  error_count INT,
  ai_confidence FLOAT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (conversation_id),
  INDEX (user_id),
  INDEX (start_time)
);

-- Logs de errores
CREATE TABLE error_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id VARCHAR(255),
  node_id VARCHAR(255),
  error_type VARCHAR(100),
  message TEXT,
  severity ENUM('low', 'medium', 'high', 'critical'),
  context JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (conversation_id),
  INDEX (node_id),
  INDEX (severity),
  INDEX (created_at)
);

-- Alertas
CREATE TABLE alerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  alert_type VARCHAR(100),
  severity ENUM('low', 'medium', 'high', 'critical'),
  message TEXT,
  status ENUM('active', 'resolved', 'dismissed'),
  flow_id VARCHAR(255) NULL,
  node_id VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  INDEX (alert_type),
  INDEX (severity),
  INDEX (status),
  INDEX (created_at)
);

-- Respuestas de IA
CREATE TABLE ai_responses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id VARCHAR(255),
  node_id VARCHAR(255),
  user_query TEXT,
  ai_response TEXT,
  confidence FLOAT,
  latency INT,
  fallback_used BOOLEAN,
  intent VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (conversation_id),
  INDEX (node_id),
  INDEX (created_at)
);
```

---

## 🎯 PLAN DE IMPLEMENTACIÓN

### Fase 1: Nodos Avanzados (4-6 semanas)

#### Semana 1-2: Nodo Database Query

- [ ] Diseñar schema de configuración
- [ ] Implementar conexión a bases de datos
- [ ] Crear UI en frontend
- [ ] Pruebas unitarias

#### Semana 3: Nodo Webhook

- [ ] Implementar llamadas HTTP
- [ ] Sistema de reintentos con backoff
- [ ] Transformación de respuestas
- [ ] Manejo de errores

#### Semana 4: Nodo Calculation

- [ ] Parser de expresiones
- [ ] Sandbox seguro (VM2)
- [ ] Validación de tipos
- [ ] Funciones built-in

#### Semana 5: Nodo Translation

- [ ] Integración con Google Translate API
- [ ] Cache de traducciones
- [ ] Soporte multi-idioma
- [ ] Detección automática

#### Semana 6: Nodo Schedule

- [ ] Gestión de zonas horarias
- [ ] Configuración de horarios
- [ ] Manejo de fechas especiales
- [ ] Pruebas

### Fase 2: Sistema de Monitoreo (3-4 semanas)

#### Semana 1: Dashboard de Métricas

- [ ] Modelo de datos para métricas
- [ ] Colector de datos en tiempo real
- [ ] API de métricas
- [ ] Gráficos básicos

#### Semana 2: Sistema de Alertas

- [ ] Motor de reglas de alertas
- [ ] Integración con Slack/Email
- [ ] Detección de ramas sin salida
- [ ] Validador de flujos

#### Semana 3: Visualizaciones Avanzadas

- [ ] Gráficos con Chart.js/Recharts
- [ ] Sankey diagram para flujos
- [ ] Heat maps de horarios
- [ ] Drill-down de conversaciones

#### Semana 4: Refinamiento y Testing

- [ ] Optimización de performance
- [ ] Pruebas de carga
- [ ] Documentación
- [ ] Capacitación

### Dependencias y Librerías

```json
{
  "platform-backend": {
    "dependencies": {
      "axios": "^1.4.0", // Para webhooks
      "vm2": "^3.9.0", // Para calculation seguro
      "google-translate-api": "^2.3.0",
      "better-sqlite3": "^9.0.0", // Para DB queries
      "mysql2": "^3.0.0",
      "mongodb": "^6.0.0"
    }
  },
  "platform-frontend": {
    "dependencies": {
      "recharts": "^2.10.0", // Gráficos
      "plotly.js": "^2.26.0", // Visualizaciones avanzadas
      "date-fns": "^2.30.0", // Manejo de fechas
      "react-big-calendar": "^1.8.0" // Calendarios
    }
  }
}
```

### Estimación de Esfuerzo

| Feature             | Frontend | Backend | Testing | Total    |
| ------------------- | -------- | ------- | ------- | -------- |
| Database Query Node | 8h       | 12h     | 5h      | 25h      |
| Webhook Node        | 6h       | 10h     | 4h      | 20h      |
| Calculation Node    | 8h       | 10h     | 5h      | 23h      |
| Translation Node    | 6h       | 8h      | 3h      | 17h      |
| Schedule Node       | 10h      | 8h      | 4h      | 22h      |
| **Nodos Total**     | **38h**  | **48h** | **21h** | **107h** |
| Metrics Dashboard   | 16h      | 12h     | 5h      | 33h      |
| Alerts System       | 8h       | 12h     | 6h      | 26h      |
| Flow Validator      | 4h       | 8h      | 4h      | 16h      |
| **Monitoreo Total** | **28h**  | **32h** | **15h** | **75h**  |
| **GRAN TOTAL**      | **66h**  | **80h** | **36h** | **182h** |

**Estimación:** ~5-6 semanas con equipo de 2 personas

---

## 💡 Beneficios Esperados

### Para Usuarios

- ✅ Flows más potentes y flexibles
- ✅ Mejor experiencia del usuario (disponibilidad, respuestas personalizadas)
- ✅ Integración con sistemas externos
- ✅ Análisis detallado de desempeño

### Para Desarrolladores

- ✅ Mejora de calidad (detección de errores)
- ✅ Debugging más fácil
- ✅ Alertas proactivas
- ✅ Capacidad de optimizar flujos

### Para el Negocio

- ✅ Mayor confiabilidad del sistema
- ✅ Reducción de errores en producción
- ✅ Mejor ROI (analítica detallada)
- ✅ Escalabilidad del producto

---

## 📚 Referencias y Inspiración

- **Node-RED:** Sistema visual de nodos (https://nodered.org)
- **Zapier:** Automatización con webhooks
- **Google Cloud Workflows:** Orquestación de servicios
- **New Relic:** Dashboard de monitoreo
- **DataDog:** Alertas inteligentes

---

**Próximos Pasos:**

1. Validar con stakeholders si estas features son prioritarias
2. Definir MVP (Mínimo producto viable)
3. Crear tickets en Jira/GitHub
4. Asignar desarrollo

¿Quieres que profundice en alguno de estos temas?

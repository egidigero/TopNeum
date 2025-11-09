# 🤖 Workflow n8n - TopNeum WhatsApp Bot

## 📋 Descripción General

Workflow completo para manejo de ventas de neumáticos por WhatsApp con tracking de estados, cotizaciones automáticas y gestión de pedidos.

---

## 🏗️ Arquitectura del Workflow

```
┌──────────────────┐
│ WhatsApp Message │ (Trigger)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Registrar        │ POST /api/n8n/registrar-mensaje
│ Mensaje Entrante │ (direccion: "entrante", enviado_por: "cliente")
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Detectar Región  │ (Function Node)
│ +54 9 11 = CABA  │ region = telefono.startsWith('+54 9 11') ? 'CABA' : 'INTERIOR'
│ Otros = INTERIOR │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Agente LLM       │ (OpenAI/Anthropic)
│ GPT-4 / Claude   │ System Prompt: docs/prompt-agente-ventas-topneum.md
│                  │ Output: JSON estructurado
└────────┬─────────┘
         │
         ├─────────────────────────────────────────┐
         │                                         │
         ▼                                         ▼
┌──────────────────┐                     ┌──────────────────┐
│ ¿Requiere        │                     │ ¿Requiere ticket │
│ búsqueda DB?     │                     │ manual?          │
└────────┬─────────┘                     └────────┬─────────┘
         │ SÍ                                     │ SÍ
         ▼                                         ▼
┌──────────────────┐                     ┌──────────────────┐
│ Buscar Productos │                     │ Crear Ticket     │
│ POST /api/n8n/   │                     │ Notificar Equipo│
│ buscar-neumaticos│                     └──────────────────┘
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Cambiar Estado   │ (Function Node)
│ Lead             │ Script: docs/scripts-nodes-n8n.md #8
│                  │ Prepara payload para actualizar estado
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Actualizar Estado│ (HTTP Request)
│ en DB            │ POST /api/n8n/actualizar-estado
│                  │ Ejecuta función SQL y registra historial
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Formatear        │ (Set Node)
│ Respuesta        │ mensaje = respuesta del agente o DB
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Registrar        │ POST /api/n8n/registrar-mensaje
│ Mensaje Saliente │ (direccion: "saliente", enviado_por: "agente_llm")
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Enviar WhatsApp  │ (WhatsApp Business API)
│ Message          │ parse_mode: markdown
└──────────────────┘
```

---

## 🔧 Nodes del Workflow

### 1. **Webhook Trigger** - Recibir Mensaje WhatsApp

**Config:**
```json
{
  "node": "Webhook",
  "method": "POST",
  "path": "/webhook/whatsapp-topneum",
  "responseMode": "lastNode",
  "authentication": "headerAuth"
}
```

**Input esperado de WhatsApp Business API:**
```json
{
  "from": "+54 9 11 1234 5678",
  "message": {
    "type": "text",
    "text": {
      "body": "Hola, necesito precio de 205/55R16"
    }
  },
  "timestamp": "1699999999"
}
```

---

### 2. **Function Node** - Extraer Datos del Mensaje

**Código:**
```javascript
// Extraer datos del webhook de WhatsApp
const from = $json.from;
const messageText = $json.message?.text?.body || '';
const timestamp = $json.timestamp;

// Detectar región automáticamente
const region = from.startsWith('+54 9 11') || from.startsWith('+5491111') 
  ? 'CABA' 
  : 'INTERIOR';

console.log(`[Región detectada] ${from} → ${region}`);

return {
  telefono_whatsapp: from,
  mensaje_texto: messageText,
  region: region,
  timestamp: timestamp,
  mensaje_original: $json
};
```

---

### 3. **HTTP Request** - Registrar Mensaje Entrante

**Config:**
```json
{
  "method": "POST",
  "url": "https://tu-dominio.com/api/n8n/registrar-mensaje",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "topneumApi",
  "headers": {
    "x-api-key": "={{$env.N8N_API_KEY}}",
    "Content-Type": "application/json"
  },
  "body": {
    "telefono_whatsapp": "={{$json.telefono_whatsapp}}",
    "direccion": "entrante",
    "contenido": "={{$json.mensaje_texto}}",
    "enviado_por": "cliente"
  }
}
```

---

### 4. **OpenAI/Anthropic Node** - Agente LLM

**Config:**
```json
{
  "model": "gpt-4-turbo-preview", // o "claude-3-5-sonnet-20241022"
  "temperature": 0.2,
  "maxTokens": 1500,
  "responseFormat": "json_object"
}
```

**System Prompt:**
```
[Copiar contenido completo de docs/prompt-agente-ventas-topneum.md]

IMPORTANTE: Tu respuesta DEBE ser un JSON válido con esta estructura:

{
  "telefono_whatsapp": "+54 9 11 1234 5678",
  "region": "CABA",
  "estado_actual": "cotizacion_enviada",
  "tipo_interaccion": "cotizacion",
  "datos_extraidos": {
    "medida_neumatico": "205/55R16",
    "marca_preferida": "HANKOOK",
    "tipo_vehiculo": "Auto",
    "tipo_uso": "ciudad"
  },
  "requiere_busqueda_db": true,
  "requiere_ticket_manual": false,
  "mensaje_a_enviar": "(mensaje para el cliente)",
  "siguiente_accion": "enviar_cotizacion"
}
```

**User Prompt:**
```
Región detectada automáticamente: {{$json.region}}
Teléfono del cliente: {{$json.telefono_whatsapp}}
Mensaje del cliente: "{{$json.mensaje_texto}}"

Analiza el mensaje y genera la respuesta apropiada en formato JSON.
```

---

### 5. **IF Node** - ¿Requiere Búsqueda en DB?

**Condición:**
```javascript
{{$json.requiere_busqueda_db}} === true
```

**Branch TRUE → Buscar Productos**
**Branch FALSE → Ir directo a respuesta**

---

### 6. **HTTP Request** - Buscar Productos (si requiere_busqueda_db = true)

**Config:**
```json
{
  "method": "POST",
  "url": "https://tu-dominio.com/api/n8n/buscar-neumaticos",
  "headers": {
    "x-api-key": "={{$env.N8N_API_KEY}}",
    "Content-Type": "application/json"
  },
  "body": {
    "telefono_whatsapp": "={{$json.telefono_whatsapp}}",
    "medida_neumatico": "={{$json.datos_extraidos.medida_neumatico}}",
    "marca": "={{$json.datos_extraidos.marca_preferida}}",
    "region": "={{$json.region}}",
    "tipo_consulta": "={{$json.tipo_interaccion}}"
  }
}
```

**Output esperado:**
```json
{
  "productos": [...],
  "mensaje": "🔍 Encontramos 5 opciones para 205/55R16...",
  "cantidad": 5,
  "medida_buscada": "205/55R16",
  "marca_buscada": "HANKOOK",
  "region": "CABA"
}
```

---

### 7. **IF Node** - ¿Requiere Ticket Manual?

**Condición:**
```javascript
{{$json.requiere_ticket_manual}} === true
```

**Branch TRUE:**
- Crear ticket en sistema
- Notificar a equipo por email/Slack
- Responder al cliente: "Estoy consultando con el equipo..."

---

### 8. **Function Node** - Cambiar Estado Lead 🔑

**⚠️ ESTE ES EL NODE CLAVE PARA CAMBIO DE ESTADOS**

**Nombre sugerido:** `Cambiar Estado Lead`
**Posición:** Después de procesar respuesta del agente

**Código completo** (copiar desde `docs/scripts-nodes-n8n.md` - Script #8):

```javascript
/**
 * Script completo para cambiar el estado del lead
 * Integra todos los pasos necesarios
 */

// ========================================
// 1. OBTENER DATOS DEL FLUJO
// ========================================

const telefono = $json.telefono_whatsapp;
const estadoNuevo = $json.estado_nuevo || $json.estado_actual;
const region = $json.region || 'CABA';
const datosExtraidos = $json.datos_extraidos || {};
const requiereBusqueda = $json.requiere_busqueda_db || false;

console.log(`[Estado] Cambiando estado a: ${estadoNuevo} para ${telefono}`);

// ========================================
// 2. PREPARAR DATOS ADICIONALES SEGÚN ESTADO
// ========================================

let datosAdicionales = {};

switch (estadoNuevo) {
  case 'conversacion_iniciada':
    // Primer contacto
    datosAdicionales = {
      primer_mensaje: $node["Detectar Región"].json.mensaje_texto,
      origen: 'whatsapp'
    };
    break;

  case 'consulta_producto':
    // Cliente consulta por medida
    datosAdicionales = {
      medida_neumatico: datosExtraidos.medida_neumatico,
      marca_preferida: datosExtraidos.marca_preferida || null,
      tipo_vehiculo: datosExtraidos.tipo_vehiculo || null,
      tipo_uso: datosExtraidos.tipo_uso || null
    };
    break;

  case 'cotizacion_enviada':
    // Se enviaron precios
    const productos = $node["Buscar Productos"]?.json?.productos || [];
    datosAdicionales = {
      productos_mostrados: productos,
      region: region,
      cantidad_productos: productos.length,
      precio_total_3cuotas: productos.reduce((sum, p) => sum + (parseFloat(p.cuota_3) || 0) * 4, 0),
      precio_total_contado: productos.reduce((sum, p) => {
        const campo = region === 'CABA' ? 'efectivo_bsas_sin_iva' : 'efectivo_interior_sin_iva';
        return sum + (parseFloat(p[campo]) || 0) * 4;
      }, 0)
    };
    break;

  case 'en_proceso_de_pago':
    // Cliente eligió forma de pago
    datosAdicionales = {
      forma_pago: datosExtraidos.forma_pago || null,
      productos: datosExtraidos.productos_elegidos || [],
      cantidad_total: datosExtraidos.cantidad_total || 4,
      total: datosExtraidos.total || 0,
      requiere_sena: datosExtraidos.forma_pago?.includes('efectivo') || false,
      monto_sena: datosExtraidos.total ? Math.round(datosExtraidos.total * 0.30) : 0
    };
    break;

  case 'pagado':
    // Pago confirmado
    datosAdicionales = {
      fecha_pago: new Date().toISOString(),
      metodo_pago: datosExtraidos.metodo_pago || null
    };
    break;

  case 'turno_agendado':
    // Turno confirmado
    datosAdicionales = {
      tipo_entrega: datosExtraidos.tipo_entrega || null,
      fecha_turno: datosExtraidos.fecha_turno || null,
      hora_turno: datosExtraidos.hora_turno || null,
      direccion_envio: datosExtraidos.direccion_envio || null
    };
    break;

  default:
    datosAdicionales = datosExtraidos;
}

// ========================================
// 3. CONSTRUIR PAYLOAD PARA API
// ========================================

const payload = {
  telefono_whatsapp: telefono,
  nuevo_estado: estadoNuevo,
  cambiado_por: 'agente_llm',
  datos_adicionales: datosAdicionales
};

console.log('[Estado] Payload preparado:', JSON.stringify(payload, null, 2));

// ========================================
// 4. VALIDACIONES
// ========================================

if (!telefono) {
  throw new Error('telefono_whatsapp es requerido');
}

if (!estadoNuevo) {
  throw new Error('estado_nuevo es requerido');
}

const estadosValidos = [
  'conversacion_iniciada',
  'consulta_producto',
  'cotizacion_enviada',
  'en_proceso_de_pago',
  'pagado',
  'turno_pendiente',
  'turno_agendado',
  'pedido_enviado',
  'pedido_finalizado',
  'abandonado'
];

if (!estadosValidos.includes(estadoNuevo)) {
  throw new Error(`Estado inválido: ${estadoNuevo}`);
}

// ========================================
// 5. RETORNAR PAYLOAD
// ========================================

// Este payload se usará en el HTTP Request node siguiente
return payload;
```

**Output de este node:**
```json
{
  "telefono_whatsapp": "+54 9 11 1234 5678",
  "nuevo_estado": "cotizacion_enviada",
  "cambiado_por": "agente_llm",
  "datos_adicionales": {
    "productos_mostrados": [...],
    "region": "CABA",
    "cantidad_productos": 5,
    "precio_total_3cuotas": 450000,
    "precio_total_contado": 380000
  }
}
```

---

### 9. **HTTP Request** - Actualizar Estado en DB

**⚠️ Este node usa el output del Function Node anterior**

**Config:**
```json
{
  "method": "POST",
  "url": "={{$env.TOPNEUM_API_URL}}/api/n8n/actualizar-estado",
  "headers": {
    "x-api-key": "={{$env.N8N_API_KEY}}",
    "Content-Type": "application/json"
  },
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{JSON.stringify($json)}}"
}
```

---

### 10. **HTTP Request** - Registrar Mensaje Saliente

**Config:**
```json
{
  "method": "POST",
  "url": "https://tu-dominio.com/api/n8n/registrar-mensaje",
  "headers": {
    "x-api-key": "={{$env.N8N_API_KEY}}",
    "Content-Type": "application/json"
  },
  "body": {
    "telefono_whatsapp": "={{$json.telefono_whatsapp}}",
    "direccion": "saliente",
    "contenido": "={{$json.mensaje_final}}",
    "enviado_por": "agente_llm"
  }
}
```

---

### 11. **WhatsApp Business API** - Enviar Mensaje

**Config:**
```json
{
  "method": "POST",
  "url": "https://graph.facebook.com/v18.0/{{$env.WHATSAPP_PHONE_ID}}/messages",
  "headers": {
    "Authorization": "Bearer {{$env.WHATSAPP_TOKEN}}",
    "Content-Type": "application/json"
  },
  "body": {
    "messaging_product": "whatsapp",
    "to": "={{$json.telefono_whatsapp}}",
    "type": "text",
    "text": {
      "preview_url": false,
      "body": "={{$json.mensaje_final}}"
    }
  }
}
```

---

## 🔐 Variables de Entorno Necesarias

Configurar en n8n Settings → Environment Variables:

```env
# API de TopNeum
N8N_API_KEY=topneum_n8n_2025_secure_key_change_this

# WhatsApp Business API
WHATSAPP_TOKEN=EAA...xxx
WHATSAPP_PHONE_ID=123456789

# OpenAI (si usas GPT)
OPENAI_API_KEY=sk-...

# Anthropic (si usas Claude)
ANTHROPIC_API_KEY=sk-ant-...

# URL de la app Next.js
TOPNEUM_API_URL=https://tu-dominio.com
```

---

## 📊 Transiciones de Estado

| Estado Actual | Evento | Nuevo Estado |
|---------------|--------|--------------|
| (ninguno) | Primer mensaje | `conversacion_iniciada` |
| `conversacion_iniciada` | Detecta medida | `consulta_producto` |
| `consulta_producto` | Envía cotización | `cotizacion_enviada` |
| `cotizacion_enviada` | Cliente elige forma de pago | `en_proceso_de_pago` |
| `en_proceso_de_pago` | Pago confirmado (CRM) | `pagado` |
| `pagado` | Cliente elige envío/colocación | `turno_pendiente` |
| `turno_pendiente` | Confirma fecha/hora | `turno_agendado` |
| `turno_agendado` | Pedido enviado | `pedido_enviado` |
| `turno_agendado` | Colocación realizada | `pedido_finalizado` |
| `pedido_enviado` | Entregado | `pedido_finalizado` |

---

## 🧪 Testing del Workflow

### 1. Test de Flujo Completo

**Mensaje 1 (Cliente):**
```
Hola, necesito precio de 205/55R16 para un auto
```

**Esperado:**
- ✅ Mensaje registrado en DB (entrante)
- ✅ Región detectada: CABA o INTERIOR
- ✅ Agente detecta medida
- ✅ Estado → `consulta_producto`
- ✅ Búsqueda en DB ejecutada
- ✅ Cotización enviada
- ✅ Estado → `cotizacion_enviada`
- ✅ Mensaje registrado en DB (saliente)
- ✅ WhatsApp enviado

---

**Mensaje 2 (Cliente):**
```
Me interesa el Hankook. Pago en 3 cuotas
```

**Esperado:**
- ✅ Agente detecta elección
- ✅ Estado → `en_proceso_de_pago`
- ✅ Datos del pedido guardados
- ✅ Link de pago generado (si aplica)
- ✅ Respuesta con instrucciones

---

### 2. Test de Casos Especiales

**Test Michelin:**
```
Cliente: Tenés Michelin 205/55R16?
```
**Esperado:**
- ✅ `requiere_ticket_manual` = true
- ✅ Ticket creado
- ✅ Respuesta: "Consultamos disponibilidad..."

---

**Test Medida No Disponible:**
```
Cliente: 999/99R99
```
**Esperado:**
- ✅ Búsqueda DB retorna 0 productos
- ✅ Respuesta: "No encontramos esa medida..."

---

## 📈 Monitoreo y Logging

**Logs en Next.js:**
```
[n8n] 📥 Recibido del agente: { telefono_whatsapp: '+54...', ... }
[n8n] 🔍 Buscando: 20555R16 marca: HANKOOK
[n8n] 📊 Encontrados: 5 productos
[n8n-estado] 📝 Actualizando estado: cotizacion_enviada
[n8n-mensaje] 💬 Registrando mensaje: saliente
```

**Logs en n8n:**
- Ver ejecuciones en "Executions" tab
- Filtrar por error/success
- Ver data de cada node

---

## 🚀 Deployment

### 1. Activar Workflow en n8n
```bash
# En n8n UI
Settings → Active: ON
```

### 2. Configurar Webhook en WhatsApp Business
```bash
# Webhook URL
https://tu-n8n.com/webhook/whatsapp-topneum

# Verify Token
tu_token_verificacion
```

### 3. Ejecutar Script SQL
```bash
# En psql o Azure Data Studio
\i scripts/005-create-leads-schema.sql
```

### 4. Verificar Endpoints
```bash
# Test búsqueda
curl -X POST "https://tu-dominio.com/api/n8n/buscar-neumaticos" \
  -H "x-api-key: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"medida_neumatico": "205/55R16", "region": "CABA"}'

# Test actualizar estado
curl -X POST "https://tu-dominio.com/api/n8n/actualizar-estado" \
  -H "x-api-key: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"telefono_whatsapp": "+54...", "nuevo_estado": "consulta_producto"}'
```

---

## � Guía Práctica: Implementación Paso a Paso

### ✅ Paso 1: Configurar Variables de Entorno en n8n

1. En n8n, ir a **Settings** → **Environments**
2. Agregar las siguientes variables:

```env
N8N_API_KEY=topneum_n8n_2025_secure_key_change_this
TOPNEUM_API_URL=https://tu-dominio.com
WHATSAPP_TOKEN=EAA...xxx
WHATSAPP_PHONE_ID=123456789
OPENAI_API_KEY=sk-...
```

---

### ✅ Paso 2: Crear Workflow en n8n

1. **Crear nuevo workflow** en n8n
2. **Agregar nodes** en este orden:

#### Node 1: Webhook Trigger
- Type: `Webhook`
- HTTP Method: `POST`
- Path: `whatsapp-topneum`
- Authentication: `None` (WhatsApp enviará token)

#### Node 2: Function - Detectar Región
- Type: `Function`
- Copiar código de: `docs/scripts-nodes-n8n.md` - Script #1

#### Node 3: HTTP Request - Registrar Mensaje Entrante
- Type: `HTTP Request`
- Method: `POST`
- URL: `={{$env.TOPNEUM_API_URL}}/api/n8n/registrar-mensaje`
- Headers:
  - `x-api-key`: `={{$env.N8N_API_KEY}}`
  - `Content-Type`: `application/json`
- Body:
```json
{
  "telefono": "={{$node['Detectar Región'].json.telefono_whatsapp}}",
  "direccion": "entrante",
  "contenido": "={{$node['Detectar Región'].json.mensaje_texto}}",
  "enviado_por": "cliente"
}
```

#### Node 4: OpenAI/Anthropic - Agente LLM
- Type: `OpenAI` o `Anthropic`
- Model: `gpt-4-turbo` o `claude-3-5-sonnet-20241022`
- System Prompt: Copiar de `docs/prompt-agente-ventas-topneum.md`
- User Message:
```
Región: {{$node['Detectar Región'].json.region}}
Teléfono: {{$node['Detectar Región'].json.telefono_whatsapp}}
Mensaje: "{{$node['Detectar Región'].json.mensaje_texto}}"

Analiza y responde en formato JSON.
```
- Output Parsing: `JSON`

#### Node 5: Function - Procesar Respuesta Agente
- Type: `Function`
- Copiar código de: `docs/scripts-nodes-n8n.md` - Script #2

#### Node 6: IF - ¿Requiere Búsqueda DB?
- Type: `IF`
- Condition: `={{$json.requiere_busqueda_db}} === true`

#### Node 7: HTTP Request - Buscar Productos (conectar a TRUE)
- Type: `HTTP Request`
- Method: `POST`
- URL: `={{$env.TOPNEUM_API_URL}}/api/n8n/buscar-neumaticos`
- Headers:
  - `x-api-key`: `={{$env.N8N_API_KEY}}`
  - `Content-Type`: `application/json`
- Body:
```json
{
  "telefono_whatsapp": "={{$json.telefono_whatsapp}}",
  "medida_neumatico": "={{$json.datos_extraidos.medida_neumatico}}",
  "marca": "={{$json.datos_extraidos.marca_preferida}}",
  "region": "={{$json.region}}",
  "tipo_consulta": "cotizacion"
}
```

#### Node 8: Function - Cambiar Estado Lead 🔑
- Type: `Function`
- **⚠️ ESTE ES EL NODE CLAVE**
- Copiar código completo de: `docs/scripts-nodes-n8n.md` - Script #8

#### Node 9: HTTP Request - Actualizar Estado en DB
- Type: `HTTP Request`
- Method: `POST`
- URL: `={{$env.TOPNEUM_API_URL}}/api/n8n/actualizar-estado`
- Headers:
  - `x-api-key`: `={{$env.N8N_API_KEY}}`
  - `Content-Type`: `application/json`
- Body: `Send Body` → `JSON` → `={{JSON.stringify($json)}}`

#### Node 10: Function - Formatear Mensaje WhatsApp
- Type: `Function`
- Copiar código de: `docs/scripts-nodes-n8n.md` - Script #5

#### Node 11: HTTP Request - Registrar Mensaje Saliente
- Type: `HTTP Request`
- Method: `POST`
- URL: `={{$env.TOPNEUM_API_URL}}/api/n8n/registrar-mensaje`
- Body:
```json
{
  "telefono": "={{$json.telefono_whatsapp}}",
  "direccion": "saliente",
  "contenido": "={{$json.mensaje_final}}",
  "enviado_por": "agente_llm"
}
```

#### Node 12: HTTP Request - Enviar WhatsApp
- Type: `HTTP Request`
- Method: `POST`
- URL: `https://graph.facebook.com/v18.0/={{$env.WHATSAPP_PHONE_ID}}/messages`
- Headers:
  - `Authorization`: `Bearer ={{$env.WHATSAPP_TOKEN}}`
  - `Content-Type`: `application/json`
- Body:
```json
{
  "messaging_product": "whatsapp",
  "to": "={{$json.telefono_whatsapp}}",
  "type": "text",
  "text": {
    "body": "={{$json.mensaje_final}}"
  }
}
```

---

### ✅ Paso 3: Testear el Workflow

#### Test Manual en n8n:

1. Ir a **Workflow** → **Execute Workflow** → **Using Test URL**
2. Copiar la URL del webhook
3. Enviar request de prueba:

```powershell
$body = @{
    from = "+54 9 11 1234 5678"
    message = @{
        type = "text"
        text = @{
            body = "Hola, necesito precio de 205/55R16"
        }
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://tu-n8n.com/webhook-test/whatsapp-topneum" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

4. **Verificar en n8n:**
   - ✅ Todos los nodes se ejecutaron
   - ✅ Node "Cambiar Estado Lead" retornó payload correcto
   - ✅ Node "Actualizar Estado en DB" retornó `success: true`
   - ✅ Mensaje enviado a WhatsApp

5. **Verificar en Base de Datos:**

```sql
-- Ver el lead creado
SELECT * FROM leads 
WHERE telefono_whatsapp = '+54 9 11 1234 5678';

-- Ver cambios de estado registrados
SELECT * FROM historial_estados 
WHERE lead_id = (SELECT id FROM leads WHERE telefono_whatsapp = '+54 9 11 1234 5678')
ORDER BY changed_at DESC;

-- Ver mensajes registrados
SELECT * FROM mensajes_whatsapp 
WHERE lead_id = (SELECT id FROM leads WHERE telefono_whatsapp = '+54 9 11 1234 5678')
ORDER BY timestamp DESC;
```

---

### ✅ Paso 4: Activar Workflow en Producción

1. **Guardar workflow** en n8n
2. **Activar** el toggle en la esquina superior derecha
3. **Copiar Production Webhook URL**
4. **Configurar en WhatsApp Business API**

---

## 🐛 Troubleshooting

### Problema: "Estado no se actualiza en DB"

**Solución:**
1. Verificar que el script SQL `005-create-leads-schema.sql` fue ejecutado
2. Verificar que la función `actualizar_estado_lead()` existe:
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'actualizar_estado_lead';
```
3. Verificar que el enum `lead_status` existe:
```sql
SELECT enumlabel FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE pg_type.typname = 'lead_status';
```

### Problema: "Function Node da error en Cambiar Estado"

**Solución:**
1. Verificar que el node anterior (`Procesar Respuesta Agente`) retorna los campos requeridos:
   - `telefono_whatsapp`
   - `estado_nuevo` o `estado_actual`
   - `datos_extraidos`
2. Revisar logs del Function Node en n8n
3. Verificar que el nombre del node "Buscar Productos" coincide exactamente

### Problema: "HTTP Request falla con 401 Unauthorized"

**Solución:**
1. Verificar que `N8N_API_KEY` está configurada en n8n Environment Variables
2. Verificar que `.env.local` de Next.js tiene la misma key
3. Verificar que el header `x-api-key` se está enviando correctamente

---

## �📝 Checklist de Implementación

- [ ] Variables de entorno configuradas en n8n
- [ ] Script SQL ejecutado (schema de leads)
- [ ] Endpoints de Next.js testeados
- [ ] Workflow importado en n8n
- [ ] Prompt del agente configurado
- [ ] Webhook de WhatsApp configurado
- [ ] **Function Node "Cambiar Estado Lead" creado y funcionando** ✅
- [ ] Test de flujo completo realizado
- [ ] Monitoreo de logs activo
- [ ] Equipo capacitado para casos especiales

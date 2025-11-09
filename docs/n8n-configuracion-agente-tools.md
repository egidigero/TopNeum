# 🔧 Configuración en n8n - Agente con Tools

## 🎯 Arquitectura Simplificada

```
┌──────────────────┐
│   WhatsApp       │
│   Webhook        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Function:      │
│   Detectar       │
│   Región         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Agente LLM     │◄───── Tool: buscar_productos (HTTP Request)
│   (GPT-4/Claude) │◄───── Tool: actualizar_estado (HTTP Request)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Enviar         │
│   WhatsApp       │
└──────────────────┘
```

**Total: 5 nodes (en vez de 12+)** 🎉

---

## 📋 Paso a Paso: Configuración

### Node 1: Webhook Trigger 🔗

**Type:** `Webhook`

**Config:**
```json
{
  "httpMethod": "POST",
  "path": "whatsapp-topneum",
  "responseMode": "lastNode",
  "options": {}
}
```

**Input esperado de WhatsApp:**
```json
{
  "from": "+54 9 11 1234 5678",
  "message": {
    "type": "text",
    "text": {
      "body": "Hola, necesito precio de 205/55R16"
    }
  },
  "timestamp": "1699523400"
}
```

---

### Node 2: Function - Detectar Región 🌍

**Type:** `Function`

**Code:**
```javascript
// Extraer datos del webhook
const from = $json.from || $json.telefono_whatsapp;
const messageText = $json.message?.text?.body || $json.text || '';

// Detectar región según código de área
let region = 'INTERIOR'; // Default

if (from) {
  const telefonoNormalizado = from.replace(/[\s\-]/g, '');
  
  // CABA/AMBA: +54 9 11
  if (telefonoNormalizado.startsWith('+54911') || 
      telefonoNormalizado.startsWith('+5491111')) {
    region = 'CABA';
  }
}

console.log(`[Región detectada] ${from} → ${region}`);

return {
  telefono_whatsapp: from,
  mensaje_texto: messageText,
  region: region,
  timestamp: new Date().toISOString()
};
```

**Output:**
```json
{
  "telefono_whatsapp": "+54 9 11 1234 5678",
  "mensaje_texto": "Hola, necesito precio de 205/55R16",
  "region": "CABA",
  "timestamp": "2025-11-09T10:30:00Z"
}
```

---

### Node 3: HTTP Request - buscar_productos (Tool) 🔍

**Type:** `HTTP Request`
**Name:** `buscar_productos` (importante: este nombre se usa en el agente)

**Config:**
```json
{
  "method": "POST",
  "url": "={{$env.TOPNEUM_API_URL}}/api/n8n/buscar-neumaticos",
  "authentication": "none",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "x-api-key",
        "value": "={{$env.N8N_API_KEY}}"
      },
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  },
  "sendBody": true,
  "contentType": "application/json",
  "specifyBody": "json",
  "jsonBody": "={{$json}}"
}
```

**NO conectar directamente al flujo. Se conecta como Tool del Agente.**

**Descripción de la tool (para el agente):**
```
Busca neumáticos en la base de datos según medida, marca y región. 
Retorna lista de productos con precios según la región del cliente (CABA o Interior).
Usar cuando el cliente consulta por una medida específica o pide precios.
```

**Schema de input (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "telefono_whatsapp": {
      "type": "string",
      "description": "Teléfono del cliente en formato +54 9 11 1234 5678"
    },
    "medida_neumatico": {
      "type": "string",
      "description": "Medida del neumático en formato 205/55R16"
    },
    "marca": {
      "type": "string",
      "description": "Marca preferida (opcional). Ejemplos: HANKOOK, FATE, FIRESTONE"
    },
    "region": {
      "type": "string",
      "enum": ["CABA", "INTERIOR"],
      "description": "Región del cliente detectada por código de área"
    },
    "tipo_consulta": {
      "type": "string",
      "enum": ["cotizacion", "consulta_precio", "consulta_stock"],
      "description": "Tipo de consulta"
    }
  },
  "required": ["telefono_whatsapp", "medida_neumatico", "region"]
}
```

---

### Node 4: HTTP Request - actualizar_estado (Tool) 📊

**Type:** `HTTP Request`
**Name:** `actualizar_estado` (importante: este nombre se usa en el agente)

**Config:**
```json
{
  "method": "POST",
  "url": "={{$env.TOPNEUM_API_URL}}/api/n8n/actualizar-estado",
  "authentication": "none",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "x-api-key",
        "value": "={{$env.N8N_API_KEY}}"
      },
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  },
  "sendBody": true,
  "contentType": "application/json",
  "specifyBody": "json",
  "jsonBody": "={{$json}}"
}
```

**NO conectar directamente al flujo. Se conecta como Tool del Agente.**

**Descripción de la tool (para el agente):**
```
Actualiza el estado del lead en el CRM y registra el tracking de la conversación.
Usar después de cada interacción importante para mantener el historial actualizado.
Estados disponibles: conversacion_iniciada, consulta_producto, cotizacion_enviada, en_proceso_de_pago, pagado, turno_pendiente, turno_agendado, pedido_enviado, pedido_finalizado.
```

**Schema de input (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "telefono_whatsapp": {
      "type": "string",
      "description": "Teléfono del cliente en formato +54 9 11 1234 5678"
    },
    "nuevo_estado": {
      "type": "string",
      "enum": [
        "conversacion_iniciada",
        "consulta_producto",
        "cotizacion_enviada",
        "en_proceso_de_pago",
        "pagado",
        "turno_pendiente",
        "turno_agendado",
        "pedido_enviado",
        "pedido_finalizado"
      ],
      "description": "Nuevo estado del lead según la etapa de la conversación"
    },
    "datos_adicionales": {
      "type": "object",
      "description": "Datos relevantes de esta etapa (medida consultada, productos elegidos, forma de pago, etc)"
    }
  },
  "required": ["telefono_whatsapp", "nuevo_estado"]
}
```

---

### Node 5: Agente LLM (OpenAI/Anthropic) 🤖

**Type:** `OpenAI` o `Anthropic Claude`

#### Si usas OpenAI:

**Model:** `gpt-4-turbo` o `gpt-4-1106-preview`

**System Message:**
```
[Copiar TODO el contenido de: docs/prompt-agente-con-tools.md]
```

**User Message:**
```
Región detectada: {{$node["Detectar Región"].json.region}}
Teléfono del cliente: {{$node["Detectar Región"].json.telefono_whatsapp}}
Mensaje del cliente: "{{$node["Detectar Región"].json.mensaje_texto}}"
```

**Tools:** 
- Conectar `buscar_productos` (Node 3)
- Conectar `actualizar_estado` (Node 4)

**Options:**
```json
{
  "temperature": 0.7,
  "maxTokens": 1000,
  "topP": 1,
  "frequencyPenalty": 0,
  "presencePenalty": 0
}
```

#### Si usas Anthropic Claude:

**Model:** `claude-3-5-sonnet-20241022`

**System Prompt:**
```
[Copiar TODO el contenido de: docs/prompt-agente-con-tools.md]
```

**User Message:**
```
Región detectada: {{$node["Detectar Región"].json.region}}
Teléfono del cliente: {{$node["Detectar Región"].json.telefono_whatsapp}}
Mensaje del cliente: "{{$node["Detectar Región"].json.mensaje_texto}}"
```

**Tools:** 
- Conectar `buscar_productos` (Node 3)
- Conectar `actualizar_estado` (Node 4)

**Options:**
```json
{
  "temperature": 0.7,
  "max_tokens": 1000
}
```

---

### Node 6: Enviar WhatsApp 📱

**Type:** `HTTP Request`

**Config:**
```json
{
  "method": "POST",
  "url": "https://graph.facebook.com/v18.0/={{$env.WHATSAPP_PHONE_ID}}/messages",
  "authentication": "none",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Authorization",
        "value": "Bearer ={{$env.WHATSAPP_TOKEN}}"
      },
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  },
  "sendBody": true,
  "contentType": "application/json",
  "jsonBody": "={{ { \"messaging_product\": \"whatsapp\", \"to\": $node[\"Detectar Región\"].json.telefono_whatsapp, \"type\": \"text\", \"text\": { \"body\": $json.output } } }}"
}
```

**Nota:** El campo `$json.output` contiene la respuesta final del agente (después de usar las tools).

---

## 🔐 Variables de Entorno

Configurar en n8n **Settings → Environment Variables:**

```env
# API de TopNeum
TOPNEUM_API_URL=https://tu-dominio.vercel.app
N8N_API_KEY=topneum_n8n_2025_secure_key

# WhatsApp Business API
WHATSAPP_TOKEN=EAA...xxx
WHATSAPP_PHONE_ID=123456789

# OpenAI (si usas GPT-4)
OPENAI_API_KEY=sk-...

# Anthropic (si usas Claude)
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🔗 Conexiones entre Nodes

```
Webhook 
  → Detectar Región 
    → Agente LLM ──┬─→ Tool: buscar_productos (no conectar directamente)
                   └─→ Tool: actualizar_estado (no conectar directamente)
      → Enviar WhatsApp
```

**Importante:** Las tools NO se conectan con flechas en el canvas. Se configuran en el node del Agente LLM.

---

## ⚙️ Cómo Conectar las Tools en el Agente

### En OpenAI Chat Model:

1. En el node del Agente, ir a **Tools**
2. Click en **Add Tool**
3. Seleccionar **HTTP Request Tool**
4. En el dropdown, elegir el node `buscar_productos`
5. Repetir para `actualizar_estado`

### En Anthropic Claude:

1. En el node del Agente, ir a **Tools**
2. Click en **Add Tool**
3. Seleccionar **HTTP Request Tool**
4. En el dropdown, elegir el node `buscar_productos`
5. Repetir para `actualizar_estado`

**Las tools aparecerán listadas en el panel de Tools del agente.**

---

## 🧪 Testing del Workflow

### 1. Test Manual en n8n

1. Click en **Execute Workflow**
2. Click en **Listen for Test Webhook**
3. Copiar la URL de test
4. Enviar request:

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

### 2. Verificar en n8n

**Workflow execution:**
- ✅ Webhook recibió mensaje
- ✅ Detectar Región → región: "CABA"
- ✅ Agente LLM ejecutó
  - ✅ Llamó tool `buscar_productos` (1 vez)
  - ✅ Llamó tool `actualizar_estado` (2 veces)
- ✅ Enviar WhatsApp → mensaje enviado

**Output del Agente:**
```
🔍 Encontramos 5 opciones para 205/55R16

━━━━━━━━━━━━━━━━━━━━━━
🏆 OPCIÓN 1 - HANKOOK OPTIMO H426
━━━━━━━━━━━━━━━━━━━━━━
📦 Stock: Disponible
💳 3 cuotas: $28.500 (Total: $114.000)
💵 PROMO CONTADO CABA: $24.000 (Total: $96.000) ⭐

[... más opciones ...]

💡 ¿Cuál te interesa?
```

### 3. Verificar en Base de Datos

```sql
-- Ver el lead creado
SELECT * FROM leads WHERE telefono_whatsapp = '+54 9 11 1234 5678';

-- Ver estados registrados
SELECT * FROM historial_estados 
WHERE lead_id = (SELECT id FROM leads WHERE telefono_whatsapp = '+54 9 11 1234 5678')
ORDER BY changed_at DESC;
```

**Resultado esperado:**
| estado_anterior | estado_nuevo | changed_at |
|----------------|--------------|------------|
| consulta_producto | cotizacion_enviada | 2025-11-09 10:30:15 |
| conversacion_iniciada | consulta_producto | 2025-11-09 10:30:05 |

---

## 📊 Monitoreo de Tools

En la ejecución del workflow, podés ver:

1. **Cuántas veces se llamó cada tool**
2. **Qué inputs envió el agente**
3. **Qué outputs recibió**
4. **Si hubo errores**

**Ejemplo de logs:**
```
[Agente] Llamando tool: buscar_productos
[Tool Input] {
  "telefono_whatsapp": "+54 9 11 1234 5678",
  "medida_neumatico": "205/55R16",
  "region": "CABA",
  "tipo_consulta": "cotizacion"
}
[Tool Output] {
  "productos": [...],
  "cantidad": 5,
  "mensaje": "🔍 Encontramos 5 opciones..."
}

[Agente] Llamando tool: actualizar_estado
[Tool Input] {
  "telefono_whatsapp": "+54 9 11 1234 5678",
  "nuevo_estado": "consulta_producto",
  "datos_adicionales": { "medida_neumatico": "205/55R16" }
}
[Tool Output] {
  "success": true,
  "mensaje": "Estado actualizado correctamente"
}
```

---

## 🚀 Activar en Producción

1. **Guardar workflow** en n8n
2. **Activar** el toggle (arriba a la derecha)
3. **Copiar Production Webhook URL**
4. **Configurar en WhatsApp Business:**
   - Webhook URL: `https://tu-n8n.com/webhook/whatsapp-topneum`
   - Verify Token: (tu token)

---

## 🐛 Troubleshooting

### "El agente no llama las tools"

**Solución:**
1. Verificar que las tools están conectadas al agente
2. Verificar que el prompt explica cuándo usar cada tool
3. Revisar logs del agente para ver su "pensamiento"

### "Tool retorna error 401"

**Solución:**
1. Verificar que `N8N_API_KEY` está en Environment Variables
2. Verificar que `.env.local` de Next.js tiene la misma key
3. Verificar que el header se envía correctamente

### "El agente usa la tool pero no registra el estado"

**Solución:**
1. Ver output de la tool `actualizar_estado` en los logs
2. Verificar que el endpoint `/api/n8n/actualizar-estado` funciona
3. Verificar que el script SQL `005-create-leads-schema.sql` fue ejecutado

---

## ✅ Checklist Final

- [ ] 5 nodes creados en n8n
- [ ] Variables de entorno configuradas
- [ ] Prompt del agente copiado (docs/prompt-agente-con-tools.md)
- [ ] Tools conectadas al agente
- [ ] Test ejecutado con éxito
- [ ] Verificado en base de datos
- [ ] Workflow activado
- [ ] Webhook configurado en WhatsApp

---

**🎉 ¡Workflow listo! Mucho más simple que la versión con 12+ nodes.**

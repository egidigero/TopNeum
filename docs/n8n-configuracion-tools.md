# 🔧 Configuración de Tools en n8n - Paso a Paso

Esta guía te muestra EXACTAMENTE cómo configurar las 3 tools que el AI Agent llamará.

**⚠️ IMPORTANTE:** Las tools NO están en n8n, están en tu **aplicación Next.js en Vercel**.

---

## 📋 ARQUITECTURA

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│   n8n        │  HTTP   │  Vercel/Next.js  │   SQL   │  PostgreSQL  │
│  AI Agent    │ ──────> │   API Routes     │ ──────> │   Database   │
└──────────────┘         └──────────────────┘         └──────────────┘
```

**Flujo:**
1. AI Agent en n8n decide llamar una tool
2. Hace HTTP POST a `https://top-neum-h5x5.vercel.app/api/...`
3. API route en Next.js procesa (consulta BD, valida, etc.)
4. Devuelve JSON al AI Agent
5. AI Agent usa la respuesta para continuar la conversación

**Ventaja:** Las tools comparten la misma BD y lógica que tu app web.

---

## 🛠️ LAS 3 TOOLS A IMPLEMENTAR EN NEXT.JS

Necesitás crear estos API routes en tu proyecto Next.js:

1. **`app/api/productos/buscar/route.ts`** → buscar_productos
2. **`app/api/leads/actualizar/route.ts`** → actualizar_estado  
3. **`app/api/tickets/crear/route.ts`** → crear_ticket

---

## 🔍 TOOL 1: buscar_productos

#### Nodo 1: Webhook (Trigger)
- **Tipo:** Webhook
- **Path:** `/tool/buscar-productos`
- **Method:** POST
- **Authentication:** None (o Bearer Token si preferís)

**Lo que recibe:**
```json
{
  "medida_neumatico": "185/60R15",
  "marca": "Pirelli",
  "region": "CABA"
}
```

#### Nodo 2: Validar Input (Code Node)
- **Name:** "Validar Parámetros"
- **Code:**

```javascript
// Validar que tenemos lo mínimo necesario
const input = $input.item.json;

if (!input.medida_neumatico) {
  return [{
    json: {
      error: true,
      mensaje: "Falta medida_neumatico"
    }
  }];
}

if (!input.region || !['CABA', 'INTERIOR'].includes(input.region)) {
  return [{
    json: {
      error: true,
      mensaje: "region debe ser 'CABA' o 'INTERIOR'"
    }
  }];
}

// Pasar datos limpios
return [{
  json: {
    medida: input.medida_neumatico.trim(),
    marca: input.marca ? input.marca.trim() : null,
    region: input.region
  }
}];
```

#### Nodo 3: Buscar en BD (PostgreSQL)
- **Name:** "Buscar Productos"
- **Operation:** Execute Query
- **Query:**

```sql
SELECT 
  p.id,
  p.marca,
  p.modelo,
  p.medida,
  p.codigo_fabricante,
  p.origen,
  p.dot_minimo,
  p.stock,
  CASE 
    WHEN $3 = 'CABA' THEN p.precio_contado_caba
    ELSE p.precio_contado_interior
  END as precio_contado,
  CASE 
    WHEN $3 = 'CABA' THEN p.precio_3_cuotas_caba
    ELSE p.precio_3_cuotas_interior
  END as precio_3_cuotas,
  p.precio_6_cuotas,
  p.precio_12_cuotas
FROM productos p
WHERE 
  p.medida = $1
  AND p.stock > 0
  AND p.activo = true
  AND ($2 IS NULL OR UPPER(p.marca) = UPPER($2))
ORDER BY 
  -- Si pidió marca específica, primero
  CASE WHEN $2 IS NOT NULL THEN 0 ELSE 1 END,
  -- Luego por orden de calidad/popularidad
  p.orden_display ASC,
  p.precio_contado_caba ASC
LIMIT 5;
```

**Query Parameters:**
- `$1` → `{{ $json.medida }}`
- `$2` → `{{ $json.marca }}`
- `$3` → `{{ $json.region }}`

#### Nodo 4: Formatear Respuesta (Code Node)
- **Name:** "Formatear Output"
- **Code:**

```javascript
const productos = $input.all();
const params = $('Validar Parámetros').item.json;

// Si no hay productos
if (productos.length === 0) {
  return [{
    json: {
      productos: [],
      cantidad_encontrados: 0,
      mensaje: params.marca 
        ? `No encontré ${params.marca} en ${params.medida} con stock disponible.`
        : `No encontré productos en ${params.medida} con stock disponible.`,
      region: params.region,
      sugerir_ticket: true
    }
  }];
}

// Formatear productos encontrados
const productosFormateados = productos.map(item => ({
  id: item.json.id,
  marca: item.json.marca,
  modelo: item.json.modelo,
  medida: item.json.medida,
  codigo_fabricante: item.json.codigo_fabricante,
  origen: item.json.origen,
  dot_minimo: item.json.dot_minimo,
  stock: item.json.stock,
  precio_contado: item.json.precio_contado,
  precio_3_cuotas: item.json.precio_3_cuotas,
  precio_6_cuotas: item.json.precio_6_cuotas,
  precio_12_cuotas: item.json.precio_12_cuotas
}));

// Crear mensaje formateado para WhatsApp
let mensaje = `🔍 Encontré ${productosFormateados.length} opciones en ${params.medida}:\n\n`;

productosFormateados.forEach((p, index) => {
  mensaje += `${index + 1}️⃣ ${p.marca} ${p.modelo}\n`;
  mensaje += `   📍 Origen: ${p.origen} | DOT: ${p.dot_minimo}+\n`;
  mensaje += `   💵 Contado: $${p.precio_contado.toLocaleString()} c/u\n`;
  mensaje += `   💳 3 cuotas: $${p.precio_3_cuotas.toLocaleString()} c/u\n`;
  mensaje += `   📦 Stock: ${p.stock} unidades\n\n`;
});

mensaje += `📍 Precios para región: ${params.region}\n`;
mensaje += `\n¿Cuál te interesa?`;

return [{
  json: {
    productos: productosFormateados,
    cantidad_encontrados: productosFormateados.length,
    mensaje_formateado: mensaje,
    region: params.region,
    marca_solicitada: params.marca,
    medida_solicitada: params.medida
  }
}];
```

#### Nodo 5: Respond to Webhook
- **Name:** "Responder"
- **Response Code:** 200
- **Response Body:** `{{ $json }}`

### Paso 3: Configurar HTTP Request para esta Tool

**Si el AI Agent llama a esta tool mediante HTTP Request:**

#### Configuración del nodo HTTP Request:

**Description:**
```
Busca productos en BD según medida y marca. Devuelve lista con precios según región.
```

**Method:**
```
POST
```

**URL:**
```
https://top-neum-h5x5.vercel.app/api/productos/buscar
```

**Authentication:**
```
None
(o Bearer Token si lo configuraste en el webhook)
```

**Send Headers:** ✅ Activado
```
Header: Content-Type
Value: application/json
```

**Send Body:** ✅ Activado
**Body Content Type:** JSON

**Body (JSON):**
```json
{
  "medida_neumatico": "{{ $json.medida_neumatico }}",
  "marca": "{{ $json.marca }}",
  "region": "{{ $json.region }}"
}
```

**Ejemplo de Body completo para testing:**
```json
{
  "medida_neumatico": "185/60R15",
  "marca": "Pirelli",
  "region": "CABA"
}
```

---

### Paso 4: Registrar Tool en AI Agent

**En el workflow principal**, al configurar el AI Agent:

**Tools → Add Tool**

```json
{
  "name": "buscar_productos",
  "description": "Busca productos en la base de datos según medida y opcionalmente marca. Devuelve lista con precios según región (CABA o INTERIOR).",
  "schema": {
    "type": "object",
    "properties": {
      "medida_neumatico": {
        "type": "string",
        "description": "Medida del neumático en formato 205/55R16"
      },
      "marca": {
        "type": "string",
        "description": "Marca específica (opcional). Si el cliente la mencionó, filtrar SOLO por esa marca."
      },
      "region": {
        "type": "string",
        "enum": ["CABA", "INTERIOR"],
        "description": "Región del cliente para calcular precios correctos"
      }
    },
    "required": ["medida_neumatico", "region"]
  },
  "url": "https://top-neum-h5x5.vercel.app/api/productos/buscar",
  "method": "POST"
}
```

---

## 🔄 TOOL 2: actualizar_estado

### Paso 1: Crear Workflow

1. Nuevo workflow: **"Tool: Actualizar Estado"**
2. Guardar

### Paso 2: Agregar nodos

#### Nodo 1: Webhook (Trigger)
- **Path:** `/tool/actualizar-estado`
- **Method:** POST

**Lo que recibe:**
```json
{
  "telefono_whatsapp": "+5491123456789",
  "nuevo_estado": "cotizado",
  "nombre": "Juan Pérez",
  "tipo_vehiculo": "Volkswagen Gol Trend",
  "medida_neumatico": "185/60R15",
  "marca_preferida": "Pirelli",
  "cantidad": 4,
  "producto_descripcion": "PIRELLI P400 EVO 185/60R15",
  "forma_pago_detalle": "Contado: $96.000",
  "precio_final": 96000,
  "notas": "Cliente consulta 185/60R15 para Gol Trend"
}
```

#### Nodo 2: Preparar Timestamp (Code Node)
- **Name:** "Agregar Timestamp a Notas"
- **Code:**

```javascript
const input = $input.item.json;

// Crear timestamp para las notas
const now = new Date();
const dia = String(now.getDate()).padStart(2, '0');
const mes = String(now.getMonth() + 1).padStart(2, '0');
const hora = String(now.getHours()).padStart(2, '0');
const min = String(now.getMinutes()).padStart(2, '0');

const timestamp = `${dia}/${mes} ${hora}:${min}`;

// Si hay notas, agregar timestamp
const notaConTimestamp = input.notas 
  ? `${timestamp} - ${input.notas}`
  : null;

return [{
  json: {
    telefono: input.telefono_whatsapp,
    nuevo_estado: input.nuevo_estado || null,
    nombre: input.nombre || null,
    tipo_vehiculo: input.tipo_vehiculo || null,
    medida_neumatico: input.medida_neumatico || null,
    marca_preferida: input.marca_preferida || null,
    cantidad: input.cantidad || null,
    producto_descripcion: input.producto_descripcion || null,
    forma_pago_detalle: input.forma_pago_detalle || null,
    precio_final: input.precio_final || null,
    nota_con_timestamp: notaConTimestamp
  }
}];
```

#### Nodo 3: Upsert en BD (PostgreSQL)
- **Name:** "Actualizar Lead"
- **Operation:** Execute Query
- **Query:**

```sql
INSERT INTO leads (
  telefono,
  estado,
  nombre,
  tipo_vehiculo,
  medida_neumatico,
  marca_preferida,
  cantidad,
  producto_descripcion,
  forma_pago_detalle,
  precio_final,
  notas,
  region,
  created_at,
  updated_at
)
VALUES (
  $1,                                      -- telefono
  COALESCE($2, 'nuevo'),                   -- estado
  $3,                                      -- nombre
  $4,                                      -- tipo_vehiculo
  $5,                                      -- medida_neumatico
  $6,                                      -- marca_preferida
  $7,                                      -- cantidad
  $8,                                      -- producto_descripcion
  $9,                                      -- forma_pago_detalle
  $10,                                     -- precio_final
  $11,                                     -- notas
  CASE 
    WHEN $1 LIKE '+54911%' THEN 'CABA'
    ELSE 'INTERIOR'
  END,                                     -- region (detectada del teléfono)
  NOW(),
  NOW()
)
ON CONFLICT (telefono) 
DO UPDATE SET
  estado = COALESCE($2, leads.estado),
  nombre = COALESCE($3, leads.nombre),
  tipo_vehiculo = COALESCE($4, leads.tipo_vehiculo),
  medida_neumatico = COALESCE($5, leads.medida_neumatico),
  marca_preferida = COALESCE($6, leads.marca_preferida),
  cantidad = COALESCE($7, leads.cantidad),
  producto_descripcion = COALESCE($8, leads.producto_descripcion),
  forma_pago_detalle = COALESCE($9, leads.forma_pago_detalle),
  precio_final = COALESCE($10, leads.precio_final),
  -- APPEND notas (no sobrescribir)
  notas = CASE 
    WHEN $11 IS NOT NULL THEN 
      CASE 
        WHEN leads.notas IS NULL OR leads.notas = '' THEN $11
        ELSE leads.notas || E'\n' || $11
      END
    ELSE leads.notas
  END,
  updated_at = NOW()
RETURNING 
  id,
  telefono,
  estado,
  nombre,
  tipo_vehiculo,
  medida_neumatico,
  marca_preferida,
  cantidad,
  producto_descripcion,
  forma_pago_detalle,
  precio_final,
  notas,
  region,
  created_at,
  updated_at;
```

**Query Parameters:**
- `$1` → `{{ $json.telefono }}`
- `$2` → `{{ $json.nuevo_estado }}`
- `$3` → `{{ $json.nombre }}`
- `$4` → `{{ $json.tipo_vehiculo }}`
- `$5` → `{{ $json.medida_neumatico }}`
- `$6` → `{{ $json.marca_preferida }}`
- `$7` → `{{ $json.cantidad }}`
- `$8` → `{{ $json.producto_descripcion }}`
- `$9` → `{{ $json.forma_pago_detalle }}`
- `$10` → `{{ $json.precio_final }}`
- `$11` → `{{ $json.nota_con_timestamp }}`

#### Nodo 4: Respond to Webhook
- **Response Code:** 200
- **Response Body:** `{{ $json }}`

---

### Paso 3: Configurar HTTP Request para esta Tool

**Si el AI Agent llama a esta tool mediante HTTP Request:**

#### Configuración del nodo HTTP Request:

**Description:**
```
Actualiza datos del lead (vehículo, medida, marca, cantidad, etc.). Acumula información.
```

**Method:**
```
POST
```

**URL:**
```
https://top-neum-h5x5.vercel.app/api/leads/actualizar
```

**Authentication:**
```
None
```

**Send Headers:** ✅ Activado
```
Header: Content-Type
Value: application/json
```

**Send Body:** ✅ Activado
**Body Content Type:** JSON

**Body (JSON):**
```json
{
  "telefono_whatsapp": "{{ $json.telefono_whatsapp }}",
  "nuevo_estado": "{{ $json.nuevo_estado }}",
  "nombre": "{{ $json.nombre }}",
  "tipo_vehiculo": "{{ $json.tipo_vehiculo }}",
  "medida_neumatico": "{{ $json.medida_neumatico }}",
  "marca_preferida": "{{ $json.marca_preferida }}",
  "cantidad": "{{ $json.cantidad }}",
  "producto_descripcion": "{{ $json.producto_descripcion }}",
  "forma_pago_detalle": "{{ $json.forma_pago_detalle }}",
  "precio_final": "{{ $json.precio_final }}",
  "notas": "{{ $json.notas }}"
}
```

**Ejemplo completo para testing:**
```json
{
  "telefono_whatsapp": "+5491123456789",
  "nuevo_estado": "cotizado",
  "nombre": "Juan Pérez",
  "tipo_vehiculo": "Volkswagen Gol Trend",
  "medida_neumatico": "185/60R15",
  "marca_preferida": "Pirelli",
  "cantidad": 4,
  "producto_descripcion": "PIRELLI P400 EVO 185/60R15",
  "forma_pago_detalle": "Contado: $96.000",
  "precio_final": 96000,
  "notas": "Cliente consulta 185/60R15 para Gol Trend"
}
```

---

### Paso 4: Registrar Tool en AI Agent

```json
{
  "name": "actualizar_estado",
  "description": "Actualiza datos del lead. Llamar DESPUÉS de cada dato nuevo del cliente. Los campos se acumulan (no se sobrescriben). Las notas se concatenan con timestamp.",
  "schema": {
    "type": "object",
    "properties": {
      "telefono_whatsapp": {
        "type": "string",
        "description": "Número de WhatsApp del cliente en formato +54911..."
      },
      "nuevo_estado": {
        "type": "string",
        "enum": ["nuevo", "en_conversacion", "cotizado", "esperando_pago", "pago_informado", "perdido"],
        "description": "Estado actual del lead"
      },
      "nombre": { "type": "string" },
      "tipo_vehiculo": { "type": "string", "description": "Ej: 'Volkswagen Gol Trend'" },
      "medida_neumatico": { "type": "string", "description": "Ej: '185/60R15'" },
      "marca_preferida": { "type": "string" },
      "cantidad": { "type": "number", "description": "Cantidad CONFIRMADA por el cliente" },
      "producto_descripcion": { "type": "string" },
      "forma_pago_detalle": { "type": "string" },
      "precio_final": { "type": "number" },
      "notas": { "type": "string", "description": "Resumen de lo que pasó en esta interacción" }
    },
    "required": ["telefono_whatsapp"]
  },
  "url": "https://top-neum-h5x5.vercel.app/api/leads/actualizar",
  "method": "POST"
}
```

---

## 🎫 TOOL 3: crear_ticket

### Paso 1: Crear Workflow

1. Nuevo workflow: **"Tool: Crear Ticket"**
2. Guardar

### Paso 2: Agregar nodos

#### Nodo 1: Webhook (Trigger)
- **Path:** `/tool/crear-ticket`
- **Method:** POST

**Lo que recibe:**
```json
{
  "telefono_whatsapp": "+5491123456789",
  "tipo": "marca_especial",
  "descripcion": "Cliente Juan Pérez consulta Michelin para Toyota Corolla, medida 205/55R16, cantidad 4, región INTERIOR",
  "prioridad": "alta"
}
```

#### Nodo 2: Validar Input (Code Node)
- **Name:** "Validar Ticket"
- **Code:**

```javascript
const input = $input.item.json;

const tiposValidos = [
  'marca_especial', 
  'medida_no_disponible', 
  'consulta_tecnica', 
  'problema_pago', 
  'reclamo', 
  'otro'
];

if (!tiposValidos.includes(input.tipo)) {
  return [{
    json: {
      error: true,
      mensaje: `Tipo inválido. Usar: ${tiposValidos.join(', ')}`
    }
  }];
}

return [{
  json: {
    telefono: input.telefono_whatsapp,
    tipo: input.tipo,
    descripcion: input.descripcion,
    prioridad: input.prioridad || 'media'
  }
}];
```

#### Nodo 3: Obtener Lead ID (PostgreSQL)
- **Name:** "Buscar Lead"
- **Query:**

```sql
SELECT id, nombre, region 
FROM leads 
WHERE telefono = $1
LIMIT 1;
```

**Parameters:** `$1` → `{{ $json.telefono }}`

#### Nodo 4: Crear Ticket (PostgreSQL)
- **Name:** "Insertar Ticket"
- **Query:**

```sql
INSERT INTO tickets (
  lead_id,
  tipo,
  descripcion,
  prioridad,
  estado,
  created_at
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  'abierto',
  NOW()
)
RETURNING 
  id,
  tipo,
  prioridad,
  estado;
```

**Parameters:**
- `$1` → `{{ $('Buscar Lead').item.json.id }}`
- `$2` → `{{ $('Validar Ticket').item.json.tipo }}`
- `$3` → `{{ $('Validar Ticket').item.json.descripcion }}`
- `$4` → `{{ $('Validar Ticket').item.json.prioridad }}`

#### Nodo 5: Formatear Respuesta (Code Node)
- **Name:** "Formatear Respuesta"
- **Code:**

```javascript
const ticket = $input.item.json;
const tipo = ticket.tipo;

// Tiempo estimado según tipo y prioridad
let tiempoRespuesta = '24-48 horas';

if (ticket.prioridad === 'alta' || tipo === 'marca_especial') {
  tiempoRespuesta = '2-4 horas';
} else if (ticket.prioridad === 'urgente') {
  tiempoRespuesta = '< 1 hora';
}

// Mensaje personalizado según tipo
let mensajeCliente = '';

switch(tipo) {
  case 'marca_especial':
    mensajeCliente = 'Tu consulta sobre marca premium fue registrada. El equipo te contactará en las próximas 2-4 horas con precio y disponibilidad.';
    break;
  case 'medida_no_disponible':
    mensajeCliente = 'Consulté con el equipo de compras. Te contactan en 24-48hs para confirmarte disponibilidad.';
    break;
  case 'consulta_tecnica':
    mensajeCliente = 'Tu consulta técnica fue registrada. Un especialista te responderá en breve.';
    break;
  default:
    mensajeCliente = 'Tu solicitud fue registrada. El equipo te contactará pronto.';
}

return [{
  json: {
    success: true,
    ticket_id: `TKT-${String(ticket.id).padStart(6, '0')}`,
    tipo: ticket.tipo,
    prioridad: ticket.prioridad,
    tiempo_estimado_respuesta: tiempoRespuesta,
    mensaje_para_cliente: mensajeCliente
  }
}];
```

#### Nodo 6: Actualizar Notas del Lead (PostgreSQL)
- **Name:** "Registrar Ticket en Notas"
- **Query:**

```sql
UPDATE leads
SET notas = COALESCE(notas, '') || E'\n' || 
  '⚠️ ' || to_char(NOW(), 'DD/MM HH24:MI') || ' - Ticket creado: ' || $2 || ' (' || $3 || ')',
  updated_at = NOW()
WHERE telefono = $1;
```

**Parameters:**
- `$1` → `{{ $('Validar Ticket').item.json.telefono }}`
- `$2` → `{{ $('Formatear Respuesta').item.json.ticket_id }}`
- `$3` → `{{ $('Validar Ticket').item.json.tipo }}`

#### Nodo 7: [OPCIONAL] Notificar al Equipo (Slack/Email)

**Si querés notificaciones automáticas:**

**Slack:**
- **Name:** "Notificar Slack"
- **Channel:** `#tickets` (o el canal que uses)
- **Message:**

```
🎫 Nuevo Ticket: {{ $('Formatear Respuesta').item.json.ticket_id }}

Tipo: {{ $('Validar Ticket').item.json.tipo }}
Prioridad: {{ $('Validar Ticket').item.json.prioridad }}

Descripción:
{{ $('Validar Ticket').item.json.descripcion }}

Cliente: {{ $('Buscar Lead').item.json.nombre || 'Sin nombre' }}
Teléfono: {{ $('Validar Ticket').item.json.telefono }}
Región: {{ $('Buscar Lead').item.json.region }}
```

#### Nodo 8: Respond to Webhook
- **Response Code:** 200
- **Response Body:** `{{ $('Formatear Respuesta').item.json }}`

---

### Paso 3: Configurar HTTP Request para esta Tool

**Si el AI Agent llama a esta tool mediante HTTP Request:**

#### Configuración del nodo HTTP Request:

**Description:**
```
Crea ticket para Michelin/BF Goodrich, medidas no disponibles, consultas técnicas
```

**Method:**
```
POST
```

**URL:**
```
https://top-neum-h5x5.vercel.app/api/tickets/crear
```

**Authentication:**
```
None
```

**Send Headers:** ✅ Activado
```
Header: Content-Type
Value: application/json
```

**Send Body:** ✅ Activado
**Body Content Type:** JSON

**Body (JSON):**
```json
{
  "telefono_whatsapp": "{{ $json.telefono_whatsapp }}",
  "tipo": "{{ $json.tipo }}",
  "descripcion": "{{ $json.descripcion }}",
  "prioridad": "{{ $json.prioridad }}"
}
```

**Ejemplo completo para testing:**
```json
{
  "telefono_whatsapp": "+5491123456789",
  "tipo": "marca_especial",
  "descripcion": "Cliente Juan Pérez consulta Michelin para Toyota Corolla, medida 205/55R16, cantidad 4, región INTERIOR",
  "prioridad": "alta"
}
```

---

### Paso 4: Registrar Tool en AI Agent

```json
{
  "name": "crear_ticket",
  "description": "Crea ticket para casos especiales: Michelin/BF Goodrich, medidas no disponibles, consultas técnicas. IMPORTANTE: Seguí recolectando datos antes de crear el ticket (vehículo, medida, cantidad, región).",
  "schema": {
    "type": "object",
    "properties": {
      "telefono_whatsapp": {
        "type": "string",
        "description": "Número del cliente"
      },
      "tipo": {
        "type": "string",
        "enum": ["marca_especial", "medida_no_disponible", "consulta_tecnica", "problema_pago", "reclamo", "otro"],
        "description": "Tipo de ticket"
      },
      "descripcion": {
        "type": "string",
        "description": "COMPLETA: nombre, vehículo, medida, cantidad, qué preguntó, región"
      },
      "prioridad": {
        "type": "string",
        "enum": ["baja", "media", "alta", "urgente"],
        "description": "Prioridad (default: media)"
      }
    },
    "required": ["telefono_whatsapp", "tipo", "descripcion"]
  },
  "url": "https://top-neum-h5x5.vercel.app/api/tickets/crear",
  "method": "POST"
}
```

---

## ✅ CHECKLIST DE CONFIGURACIÓN

### Para cada tool:

- [ ] Workflow creado y guardado
- [ ] Webhook configurado con path correcto
- [ ] Nodos de validación y procesamiento agregados
- [ ] Queries SQL probadas (podés usar DBeaver o pgAdmin)
- [ ] Respond to Webhook configurado
- [ ] Tool registrada en AI Agent principal
- [ ] URL del webhook actualizada en la configuración del tool

### Testing individual:

Podés probar cada tool con **Postman** o **curl**:

```bash
# Buscar productos
curl -X POST https://tu-instancia.n8n.cloud/webhook/tool/buscar-productos \
  -H "Content-Type: application/json" \
  -d '{"medida_neumatico":"185/60R15","marca":"Pirelli","region":"CABA"}'

# Actualizar estado
curl -X POST https://tu-instancia.n8n.cloud/webhook/tool/actualizar-estado \
  -H "Content-Type: application/json" \
  -d '{"telefono_whatsapp":"+5491123456789","notas":"Cliente consulta prueba","tipo_vehiculo":"Gol Trend"}'

# Crear ticket
curl -X POST https://tu-instancia.n8n.cloud/webhook/tool/crear-ticket \
  -H "Content-Type: application/json" \
  -d '{"telefono_whatsapp":"+5491123456789","tipo":"marca_especial","descripcion":"Test Michelin","prioridad":"alta"}'
```

---

## 🚀 SIGUIENTE PASO

Una vez que las 3 tools estén configuradas y probadas:

1. Configurar el **Workflow Principal** (WhatsApp → Memoria → AI Agent)
2. Probar flujo completo de conversación
3. Ajustar según necesidad

¿Querés que te arme el workflow principal ahora?

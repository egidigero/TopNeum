# 🚀 Guía de Implementación en n8n

## 📦 Lo que necesitás tener listo:

1. ✅ Prompt v2 (ya está en `prompt-agente-v2.md`)
2. ✅ Estructura de las 3 tools (ya está en `n8n-tools-estructura.md`)
3. 🔧 Ahora: Implementar en n8n

---

## 🏗️ PASO 1: Crear Workflow Principal

**Nombre:** `TopNeum - Agente Ventas v2`

### Nodos que necesitás:

```
1. WhatsApp Trigger (recibe mensaje)
   ↓
2. PostgreSQL: Leer Memoria del Lead ⭐ CLAVE
   ↓ (Si existe)    ↓ (Si NO existe)
   |                |
   └─────→ IF ←─────┘
           ↓
   (Objeto con memoria completa)
           ↓
3. AI Agent (con memoria como contexto)
   ↓
   El agente puede llamar tools:
   - buscar_productos
   - actualizar_estado (guarda en BD)
   - crear_ticket
   ↓
4. WhatsApp: Enviar respuesta
```

**🔑 IMPORTANTE:** 
- El nodo "Leer Memoria del Lead" corre **ANTES** del AI Agent
- La memoria se pasa como **Context**, NO como mensaje del usuario
- El agente lee la memoria y actúa en consecuencia
- Cuando el agente llama `actualizar_estado`, se guarda en BD
- En el próximo mensaje, esa info YA estará en la memoria

---

## 📋 PASO 2: Configurar PostgreSQL - Leer Memoria del Lead ⭐ CLAVE

**⚠️ ESTO ES LA MEMORIA DEL AGENTE**

El agente NO tiene memoria entre mensajes. Por eso, **antes de cada respuesta, debés leerle TODA la info del lead** para que tenga contexto.

**Node:** PostgreSQL (nombre: "Leer Memoria del Lead")

**Query:**
```sql
SELECT 
  id,
  telefono,
  nombre,
  estado,
  tipo_vehiculo,
  medida_neumatico,
  marca_preferida,
  cantidad,
  producto_descripcion,
  forma_pago_detalle,
  precio_final,
  COALESCE(notas, '') as notas,
  region,
  created_at,
  updated_at
FROM leads
WHERE telefono = $1
LIMIT 1
```

**Parameters:**
```json
{
  "parameters": ["{{ $json.from }}"]
}
```

**Si no encuentra el lead:**
Usar un nodo IF:
- **Si existe (rows > 0):** Pasar los datos al AI Agent
- **Si NO existe (rows = 0):** Crear un objeto vacío con valores por defecto:
  ```json
  {
    "telefono": "{{ $json.from }}",
    "estado": "nuevo",
    "nombre": null,
    "tipo_vehiculo": null,
    "medida_neumatico": null,
    "marca_preferida": null,
    "cantidad": null,
    "notas": "",
    "region": "CABA"  // Detectar del teléfono
  }
  ```

**Output que le llega al AI Agent (como contexto):**
```json
{
  "telefono": "+5491123456789",
  "estado": "cotizado",
  "nombre": "Juan Pérez",
  "tipo_vehiculo": "Volkswagen Gol Trend",
  "medida_neumatico": "185/60R15",
  "marca_preferida": "Pirelli",
  "cantidad": 4,
  "notas": "15/12 14:30 - Cliente consulta 185/60R15 para Gol Trend\n16/12 10:00 - Prefiere marca Pirelli\n16/12 10:05 - Cotizado Pirelli P400 EVO a $96k",
  "region": "CABA"
}
```

**🔑 IMPORTANTE:** Esta info se pasa como **contexto** al AI Agent, NO como mensaje del usuario.

**Por qué Context y NO Tool:**
- El agente NO tiene una tool "leer_memoria"
- La memoria se le PROPORCIONA automáticamente en cada mensaje
- Así el agente SIEMPRE tiene la info sin tener que pedirla
- Es más eficiente: evita una llamada extra a tool en CADA mensaje

---

## 🤖 PASO 3: Configurar AI Agent ⭐ CLAVE

**Model:** gpt-4o o claude-sonnet-3.5

**System Prompt:** Copiar completo de `prompt-agente-v2.md`

**Context (⚠️ MUY IMPORTANTE - ESTO ES LA MEMORIA QUE EL AGENTE RECIBE AUTOMÁTICAMENTE):**

```
MEMORIA DEL CLIENTE:

Teléfono: {{ $('Leer Memoria del Lead').item.json.telefono }}
Estado actual: {{ $('Leer Memoria del Lead').item.json.estado }}

{{ #if $('Leer Memoria del Lead').item.json.nombre }}
Nombre: {{ $('Leer Memoria del Lead').item.json.nombre }}
{{ /if }}

{{ #if $('Leer Memoria del Lead').item.json.tipo_vehiculo }}
Vehículo: {{ $('Leer Memoria del Lead').item.json.tipo_vehiculo }}
{{ /if }}

{{ #if $('Leer Memoria del Lead').item.json.medida_neumatico }}
Medida: {{ $('Leer Memoria del Lead').item.json.medida_neumatico }}
{{ /if }}

{{ #if $('Leer Memoria del Lead').item.json.marca_preferida }}
Marca preferida: {{ $('Leer Memoria del Lead').item.json.marca_preferida }}
{{ /if }}

{{ #if $('Leer Memoria del Lead').item.json.cantidad }}
Cantidad: {{ $('Leer Memoria del Lead').item.json.cantidad }}
{{ /if }}

{{ #if $('Leer Memoria del Lead').item.json.producto_descripcion }}
Producto elegido: {{ $('Leer Memoria del Lead').item.json.producto_descripcion }}
Forma de pago: {{ $('Leer Memoria del Lead').item.json.forma_pago_detalle }}
Precio final: ${{ $('Leer Memoria del Lead').item.json.precio_final }}
{{ /if }}

Región: {{ $('Leer Memoria del Lead').item.json.region }}

HISTORIAL DE INTERACCIONES (Notas):
{{ $('Leer Memoria del Lead').item.json.notas }}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ INSTRUCCIÓN CRÍTICA:
Lee TODA esta memoria ANTES de responder.
NO preguntes nada que ya esté arriba.
Usá esta info para dar respuestas personalizadas y contextuales.
```

**User Message:**
```
{{ $json.body }}
```

**Tools:** Aquí configurás las 3 tools (ver abajo)

---

### 💡 ¿Cómo funciona la memoria?

```
┌─────────────────────────────────────────────┐
│  1. Cliente envía: "Hola"                   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  2. Leer BD: ¿Existe lead?                  │
│     → NO existe                             │
│     → Devolver objeto vacío (nuevo cliente) │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  3. AI Agent recibe:                        │
│     Context: "Memoria: Estado=nuevo,        │
│               Notas='' (vacío)"             │
│     Message: "Hola"                         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  4. Agente responde: Saludo fijo (FASE 1)  │
│     Llama: actualizar_estado(estado:"nuevo")│
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  5. Cliente: "185/60R15 para Gol Trend"     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  6. Leer BD de nuevo:                       │
│     → Ahora SÍ existe                       │
│     → estado: "nuevo"                       │
│     → notas: "15/12 10:00 - Lead creado"   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  7. AI Agent recibe:                        │
│     Context: "Memoria: Estado=nuevo,        │
│               Notas='15/12 10:00...'        │
│               (resto vacío)"                │
│     Message: "185/60R15 para Gol Trend"     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  8. Agente:                                 │
│     - Lee memoria (ve que es nuevo)         │
│     - Llama actualizar_estado(              │
│         tipo_vehiculo: "Gol Trend",         │
│         medida: "185/60R15",                │
│         notas: "Cliente consulta..."        │
│       )                                     │
│     - Llama buscar_productos(...)           │
│     - Responde con cotización               │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  9. Cliente: "¿Cuánto sale?"                │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  10. Leer BD de nuevo:                      │
│      → estado: "cotizado"                   │
│      → tipo_vehiculo: "Gol Trend"           │
│      → medida: "185/60R15"                  │
│      → notas: "...Cliente consulta...       │
│                 Cotizado Pirelli..."        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  11. AI Agent recibe:                       │
│      Context: "Memoria:                     │
│        Vehículo: Gol Trend                  │
│        Medida: 185/60R15                    │
│        Estado: cotizado                     │
│        Notas: ya cotizado..."               │
│      Message: "¿Cuánto sale?"               │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  12. Agente:                                │
│      - Lee memoria: Ya tiene vehículo,      │
│        medida, y ya cotizó                  │
│      - NO pregunta de nuevo                 │
│      - Responde: "Para tu Gol Trend en      │
│        185/60R15, ya te pasé los precios... │
│        El Pirelli sale $145k las 4"         │
└─────────────────────────────────────────────┘
```

**🔑 Resumen:**
- En **CADA mensaje** del cliente, primero LEES la BD
- La info del lead se pasa como **Context** al AI Agent
- El agente lee la memoria y NO repite preguntas
- Cuando el agente llama `actualizar_estado`, se GUARDA en BD
- En el SIGUIENTE mensaje, esa info YA está en la memoria

**✅ Ventajas:**
- Cero memoria "mágica" - Todo en BD
- Agente siempre tiene contexto completo
- Fácil debug (ves exactamente qué memoria tiene)
- Soporta múltiples consultas naturalmente

---

## 🛠️ PASO 4: Configurar Tool 1 - buscar_productos

**En n8n, esta tool apunta a otro workflow:**

### Workflow: `Tool - Buscar Productos`

**Trigger:** Webhook

**Nodos:**
```
1. Webhook (recibe JSON)
   ↓
2. PostgreSQL: Buscar productos
   ↓
3. Code: Formatear respuesta
   ↓
4. Respond to Webhook
```

**PostgreSQL Query:**
```sql
SELECT 
  marca,
  modelo,
  medida,
  CASE 
    WHEN $2 = 'CABA' THEN precio_contado_caba
    ELSE precio_contado_interior
  END as precio_contado,
  precio_3_cuotas,
  precio_6_cuotas,
  precio_12_cuotas,
  stock,
  popularidad
FROM productos
WHERE medida = $1
  AND stock > 0
  AND ($3 IS NULL OR marca ILIKE $3)
ORDER BY 
  CASE WHEN $3 IS NOT NULL THEN 0 ELSE 1 END,
  popularidad DESC
LIMIT 3
```

**Code Node (formatear):**
```javascript
// Si pidió marca específica pero no hay stock
if (items.length === 0 && $input.item.json.marca) {
  return {
    json: {
      productos: [],
      sin_stock: true,
      marca_solicitada: $input.item.json.marca,
      mensaje: `No hay stock de ${$input.item.json.marca} en esa medida`
    }
  };
}

// Formatear productos encontrados
return {
  json: {
    productos: items.map(item => ({
      marca: item.json.marca,
      modelo: item.json.modelo,
      medida: item.json.medida,
      precio_contado: item.json.precio_contado,
      precio_3_cuotas: item.json.precio_3_cuotas,
      stock: item.json.stock
    })),
    cantidad_encontrados: items.length,
    region: $input.item.json.region,
    sin_stock: false
  }
};
```

**Configuración en el AI Agent:**
```json
{
  "name": "buscar_productos",
  "description": "Busca productos en la base de datos según medida y opcionalmente marca. Si el cliente pidió marca específica, buscar SOLO esa marca.",
  "schema": {
    "type": "object",
    "properties": {
      "medida_neumatico": {
        "type": "string",
        "description": "Medida del neumático en formato 205/55R16"
      },
      "marca": {
        "type": "string",
        "description": "Marca específica si el cliente la mencionó (ej: Pirelli, Hankook). Si no mencionó marca, dejar en null."
      },
      "region": {
        "type": "string",
        "enum": ["CABA", "INTERIOR"],
        "description": "CABA si teléfono empieza con +54911, sino INTERIOR"
      }
    },
    "required": ["medida_neumatico", "region"]
  }
}
```

---

## 🛠️ PASO 5: Configurar Tool 2 - actualizar_estado

### Workflow: `Tool - Actualizar Estado`

**Trigger:** Webhook

**Nodos:**
```
1. Webhook (recibe JSON)
   ↓
2. Code: Procesar campos y agregar timestamp a notas
   ↓
3. PostgreSQL: Upsert en leads (actualiza solo campos proporcionados)
   ↓
4. PostgreSQL: Leer estado completo del lead
   ↓
5. Respond to Webhook
```

**Code Node (procesar):**
```javascript
const ahora = new Date().toLocaleString('es-AR', { 
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

const input = items[0].json;

// Preparar notas con timestamp si existen
let notasConTimestamp = null;
if (input.notas) {
  notasConTimestamp = `${ahora} - ${input.notas}`;
}

return {
  json: {
    telefono_whatsapp: input.telefono_whatsapp,
    nuevo_estado: input.nuevo_estado || null,
    nombre: input.nombre || null,
    tipo_vehiculo: input.tipo_vehiculo || null,
    medida_neumatico: input.medida_neumatico || null,
    marca_preferida: input.marca_preferida || null,
    cantidad: input.cantidad || null,
    producto_descripcion: input.producto_descripcion || null,
    forma_pago_detalle: input.forma_pago_detalle || null,
    precio_final: input.precio_final || null,
    notas_con_timestamp: notasConTimestamp
  }
};
```

**PostgreSQL Upsert (IMPORTANTE - actualiza solo campos proporcionados):**
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
  updated_at,
  created_at
)
VALUES (
  $1,  -- telefono
  COALESCE($2, 'nuevo'),  -- estado
  $3,  -- nombre
  $4,  -- tipo_vehiculo
  $5,  -- medida_neumatico
  $6,  -- marca_preferida
  $7,  -- cantidad
  $8,  -- producto_descripcion
  $9,  -- forma_pago_detalle
  $10, -- precio_final
  $11, -- notas con timestamp
  CASE 
    WHEN $1 LIKE '+54911%' THEN 'CABA'
    ELSE 'INTERIOR'
  END,
  NOW(),
  NOW()
)
ON CONFLICT (telefono) 
DO UPDATE SET 
  -- Solo actualizar si el valor nuevo NO es null
  estado = COALESCE($2, leads.estado),
  nombre = COALESCE($3, leads.nombre),
  tipo_vehiculo = COALESCE($4, leads.tipo_vehiculo),
  medida_neumatico = COALESCE($5, leads.medida_neumatico),
  marca_preferida = COALESCE($6, leads.marca_preferida),
  cantidad = COALESCE($7, leads.cantidad),
  producto_descripcion = COALESCE($8, leads.producto_descripcion),
  forma_pago_detalle = COALESCE($9, leads.forma_pago_detalle),
  precio_final = COALESCE($10, leads.precio_final),
  -- Concatenar notas nuevas a las existentes
  notas = CASE 
    WHEN $11 IS NOT NULL AND leads.notas IS NOT NULL 
    THEN leads.notas || E'\n' || $11
    WHEN $11 IS NOT NULL 
    THEN $11
    ELSE leads.notas
  END,
  updated_at = NOW()
RETURNING id
```

**PostgreSQL Leer estado completo:**
```sql
SELECT 
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
  COALESCE(notas, '') as notas,
  region
FROM leads
WHERE telefono = $1
```

**Configuración en el AI Agent:**
```json
{
  "name": "actualizar_estado",
  "description": "Actualiza información del cliente en la BD. Guardar CADA dato que mencione (nombre, vehículo, medida, marca, cantidad, etc.) inmediatamente. Los datos se acumulan, no se sobrescriben - soporta múltiples consultas.",
  "schema": {
    "type": "object",
    "properties": {
      "telefono_whatsapp": {
        "type": "string",
        "description": "Número de WhatsApp del cliente"
      },
      "nuevo_estado": {
        "type": "string",
        "enum": ["nuevo", "en_conversacion", "cotizado", "esperando_pago", "pago_informado", "perdido"],
        "description": "Estado del lead (opcional)"
      },
      "nombre": {
        "type": "string",
        "description": "Nombre del cliente si lo menciona"
      },
      "tipo_vehiculo": {
        "type": "string",
        "description": "Modelo de vehículo. Ej: 'Volkswagen Gol Trend'"
      },
      "medida_neumatico": {
        "type": "string",
        "description": "Medida del neumático. Ej: '185/60R15'"
      },
      "marca_preferida": {
        "type": "string",
        "description": "Marca preferida. Ej: 'Pirelli'"
      },
      "cantidad": {
        "type": "number",
        "description": "Cantidad confirmada explícitamente por el cliente"
      },
      "producto_descripcion": {
        "type": "string",
        "description": "Producto elegido. Ej: 'PIRELLI P400 EVO 185/60R15'"
      },
      "forma_pago_detalle": {
        "type": "string",
        "description": "Forma de pago. Ej: 'Contado: $96.000'"
      },
      "precio_final": {
        "type": "number",
        "description": "Precio total final"
      },
      "notas": {
        "type": "string",
        "description": "Descripción natural de la interacción. Ej: 'Cliente consulta 185/60R15 para Gol Trend'"
      }
    },
    "required": ["telefono_whatsapp"]
  }
}
```

---

## 🛠️ PASO 6: Configurar Tool 3 - crear_ticket

### Workflow: `Tool - Crear Ticket`

**Trigger:** Webhook

**Nodos:**
```
1. Webhook (recibe JSON)
   ↓
2. PostgreSQL: Insertar ticket
   ↓
3. PostgreSQL: Actualizar notas del lead
   ↓
4. Slack/Email: Notificar equipo (opcional)
   ↓
5. Respond to Webhook
```

**PostgreSQL Insert Ticket:**
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
  (SELECT id FROM leads WHERE telefono = $1),
  $2,
  $3,
  COALESCE($4, 'media'),
  'abierto',
  NOW()
)
RETURNING id, tipo, prioridad
```

**PostgreSQL Actualizar Notas Lead:**
```sql
UPDATE leads
SET notas = notas || E'\n' || $1
WHERE telefono = $2
```

Donde `$1` = `"[Ticket TKT-{id} creado] {tipo} - {descripcion}"`

**Configuración en el AI Agent:**
```json
{
  "name": "crear_ticket",
  "description": "Crea un ticket para casos especiales: Michelin/BF Goodrich, medida no disponible, consultas técnicas, reclamos",
  "schema": {
    "type": "object",
    "properties": {
      "telefono_whatsapp": {
        "type": "string"
      },
      "tipo": {
        "type": "string",
        "enum": ["marca_especial", "medida_no_disponible", "consulta_tecnica", "problema_pago", "reclamo", "otro"]
      },
      "descripcion": {
        "type": "string",
        "description": "Descripción COMPLETA: nombre cliente, vehículo, medida, qué preguntó, cuándo"
      },
      "prioridad": {
        "type": "string",
        "enum": ["baja", "media", "alta", "urgente"],
        "description": "Por defecto 'alta' para Michelin y medidas no disponibles"
      }
    },
    "required": ["telefono_whatsapp", "tipo", "descripcion"]
  }
}
```

---

## ✅ PASO 7: Testing

### Test 1: Primera conversación
```
Cliente: "Hola, necesito cubiertas para un Gol Trend"

Esperado:
- Saluda
- Pide medida
- Llama actualizar_seguimiento("Cliente tiene Gol Trend")
```

### Test 2: Cliente pide marca específica
```
Cliente: "Necesito Pirelli 185/60R15"

Esperado:
- Llama buscar_productos con marca="Pirelli"
- Muestra SOLO Pirelli (no otras marcas)
- Si no hay Pirelli, dice "no hay stock" y sugiere alternativas
```

### Test 3: Memoria
```
Conversación anterior en notas: "Cliente tiene Gol Trend, necesita 185/60R15"
Cliente nuevo mensaje: "Cuánto sale?"

Esperado:
- Lee las notas
- NO pregunta de nuevo medida o auto
- Busca productos directamente
```

### Test 4: Michelin
```
Cliente: "Tenés Michelin Energy 205/55R16?"

Esperado:
- NO llama buscar_productos
- Llama crear_ticket con tipo="marca_especial"
- Responde que el equipo lo contactará
```

---

## 🎯 MEJORAS OPCIONALES

### 1. Validar teléfono
Agregar un nodo que valide el formato del teléfono antes de buscar el lead.

### 2. Rate limiting
Si el cliente escribe 10 veces seguido, agregar un delay.

### 3. Horario comercial
Si es fuera de horario (después de 18hs o fin de semana), respuesta automática:
```
"Hola! Ya recibimos tu mensaje. Te respondemos en horario comercial (Lunes a Viernes 9-18hs). Gracias!"
```

### 4. Fallback
Si el agente no puede resolver algo, crear ticket automático tipo "otro".

### 5. Analytics
Agregar nodo que registre:
- Tiempo de respuesta
- Cantidad de tools usadas
- Tasa de conversión (cotizado → pago)

---

## 🐛 DEBUG Tips

### El agente repite preguntas:
- ✅ Verificá que las notas se estén leyendo correctamente
- ✅ Verificá que el prompt tenga: "Leé las notas ANTES de responder"

### No muestra solo la marca que pidió:
- ✅ Verificá el query de PostgreSQL: `AND ($3 IS NULL OR marca ILIKE $3)`
- ✅ Verificá que el agente esté pasando el parámetro `marca` correctamente

### Crea tickets de más:
- ✅ Mejorar la descripción de la tool `crear_ticket` para que sea más específica

### No valida precios:
- ✅ Agregar en el prompt: "SIEMPRE llamar buscar_productos antes de confirmar precio"

---

## 📊 Monitoring

Crear un dashboard simple:
```sql
-- Leads por estado
SELECT estado, COUNT(*) 
FROM leads 
GROUP BY estado;

-- Tickets abiertos
SELECT tipo, prioridad, COUNT(*) 
FROM tickets 
WHERE estado = 'abierto'
GROUP BY tipo, prioridad;

-- Conversiones por día
SELECT DATE(created_at), COUNT(*) 
FROM leads 
WHERE estado = 'esperando_pago'
GROUP BY DATE(created_at);
```

---

**¡Listo! Con esto tenés el sistema completo funcionando.** 🚀

Si algo no funciona, revisá los logs de n8n y fijate qué tool está fallando.

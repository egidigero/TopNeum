# 🛠️ Estructura de Tools para n8n

En n8n, las tools van **separadas** del prompt del agente. Cada tool es un "endpoint" que el agente puede llamar.

---

## 📋 TOOL 1: buscar_productos

**Descripción para n8n:**
```
Busca productos en la base de datos de TopNeum según medida y opcionalmente marca. 
Devuelve lista de productos disponibles con precios según región.
```

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "medida_neumatico": {
      "type": "string",
      "description": "Medida del neumático en formato 205/55R16"
    },
    "marca": {
      "type": "string",
      "description": "Marca específica a buscar (opcional). Si el cliente la mencionó, filtrar solo por esa marca. Si es null, traer las mejores 2-3 opciones."
    },
    "region": {
      "type": "string",
      "enum": ["CABA", "INTERIOR"],
      "description": "Región del cliente para calcular precio correcto"
    }
  },
  "required": ["medida_neumatico", "region"]
}
```

**Qué hace la tool (lógica interna):**
1. Recibe los parámetros
2. Hace query a la BD:
   - Si `marca` no es null → Buscar SOLO esa marca
   - Si `marca` es null → Traer las 2-3 mejores opciones (ordenar por popularidad/precio)
3. Obtener precios según región
4. Formatear resultado

**Output esperado:**
```json
{
  "productos": [
    {
      "marca": "PIRELLI",
      "modelo": "P400 EVO",
      "medida": "185/60R15",
      "precio_contado": 36250,
      "precio_3_cuotas": 38500,
      "stock": 10
    }
  ],
  "cantidad_encontrados": 1,
  "region": "CABA"
}
```

---

## 📋 TOOL 2: actualizar_estado

**Descripción para n8n:**
```
Actualiza el estado y datos del lead en la base de datos. Guarda información estructurada
(tipo_vehiculo, medida, marca, etc.) y también notas en texto natural. Los datos se
acumulan, no se sobrescriben - soporta múltiples consultas del mismo cliente.
```

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "telefono_whatsapp": {
      "type": "string",
      "description": "Número de WhatsApp del cliente en formato +54911..."
    },
    "nuevo_estado": {
      "type": "string",
      "enum": ["nuevo", "en_conversacion", "cotizado", "esperando_pago", "pago_informado", "perdido"],
      "description": "Estado actual del lead (opcional)"
    },
    "nombre": {
      "type": "string",
      "description": "Nombre del cliente si lo menciona"
    },
    "tipo_vehiculo": {
      "type": "string",
      "description": "Modelo de vehículo mencionado. Ejemplo: 'Volkswagen Gol Trend'"
    },
    "medida_neumatico": {
      "type": "string",
      "description": "Medida del neumático. Ejemplo: '185/60R15'"
    },
    "marca_preferida": {
      "type": "string",
      "description": "Marca que prefiere el cliente. Ejemplo: 'Pirelli'"
    },
    "cantidad": {
      "type": "number",
      "description": "Cantidad de cubiertas confirmada explícitamente por el cliente"
    },
    "producto_descripcion": {
      "type": "string",
      "description": "Descripción completa del producto elegido. Ejemplo: 'PIRELLI P400 EVO 185/60R15'"
    },
    "forma_pago_detalle": {
      "type": "string",
      "description": "Forma de pago elegida con detalle. Ejemplo: 'Contado: $96.000' o '3 cuotas: $34.200'"
    },
    "precio_final": {
      "type": "number",
      "description": "Precio total final validado de la BD"
    },
    "notas": {
      "type": "string",
      "description": "Texto natural describiendo lo que pasó en la interacción. Ejemplo: 'Cliente consulta 185/60R15 para Gol Trend, prefiere Pirelli'"
    }
  },
  "required": ["telefono_whatsapp"]
}
```

**Qué hace la tool (lógica interna):**
1. Busca el lead por teléfono (o lo crea si no existe)
2. **Actualiza solo los campos proporcionados** (no sobrescribe los demás)
3. **APPEND** notas nuevas a las existentes con timestamp
4. Actualiza el estado si se proporcionó
5. Actualiza `updated_at`
6. Devuelve el estado actual completo del lead

**Output esperado:**
```json
{
  "success": true,
  "lead_id": "abc123",
  "estado": "cotizado",
  "tipo_vehiculo": "Volkswagen Gol Trend",
  "medida_neumatico": "185/60R15",
  "marca_preferida": "Pirelli",
  "cantidad": 4,
  "notas": "15/12 14:30 - Cliente consulta 185/60R15 para Gol Trend\n16/12 10:00 - Prefiere Pirelli\n16/12 10:05 - Cotizado Pirelli P400 EVO a $96k"
}
```

**IMPORTANTE:** 
- Los datos se ACUMULAN para soportar múltiples consultas
- Las notas se concatenan con timestamps para mantener historial
- El agente recibe toda la memoria del lead en cada interacción

---

## 📋 TOOL 3: crear_ticket

**Descripción para n8n:**
```
Crea un ticket de atención para casos especiales que requieren intervención humana.
```

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "telefono_whatsapp": {
      "type": "string",
      "description": "Número de WhatsApp del cliente"
    },
    "tipo": {
      "type": "string",
      "enum": ["marca_especial", "medida_no_disponible", "consulta_tecnica", "problema_pago", "reclamo", "otro"],
      "description": "Tipo de ticket"
    },
    "descripcion": {
      "type": "string",
      "description": "Descripción COMPLETA del caso. Debe incluir: nombre del cliente (si se tiene), vehículo, medida, qué preguntó exactamente, fecha/hora. Sea específico."
    },
    "prioridad": {
      "type": "string",
      "enum": ["baja", "media", "alta", "urgente"],
      "description": "Prioridad del ticket"
    }
  },
  "required": ["telefono_whatsapp", "tipo", "descripcion"]
}
```

**Qué hace la tool (lógica interna):**
1. Crea registro en tabla `tickets`
2. Vincula con el lead correspondiente
3. Notifica al equipo (Slack/Email/WhatsApp según prioridad)
4. Registra en las notas del lead que se creó un ticket

**Output esperado:**
```json
{
  "success": true,
  "ticket_id": "TKT-001234",
  "tiempo_estimado_respuesta": "2-4 horas",
  "mensaje_para_cliente": "Tu consulta fue registrada. El equipo te contactará en las próximas 2-4 horas."
}
```

---

## 🔄 FLUJO EN N8N

```
┌─────────────────────────────────────────────┐
│  1. WhatsApp Trigger (mensaje del cliente)  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  2. Leer notas del lead (por teléfono)      │
│     → Si no existe, notas = ""              │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  3. AI Agent                                │
│     - Prompt cargado                        │
│     - Contexto: notas del lead              │
│     - Tools disponibles:                    │
│       * buscar_productos                    │
│       * actualizar_seguimiento              │
│       * crear_ticket                        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  4. El agente llama tools según necesite    │
│     Cada tool hace su proceso y devuelve    │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  5. Agente genera respuesta final           │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  6. Enviar respuesta por WhatsApp           │
└─────────────────────────────────────────────┘
```

---

## 📝 NOTAS TÉCNICAS

### buscar_productos:
- **Endpoint:** Puede ser un nodo de PostgreSQL + Code node para formatear
- **Query:**
  ```sql
  SELECT p.*, 
         CASE 
           WHEN $region = 'CABA' THEN p.precio_contado_caba
           ELSE p.precio_contado_interior
         END as precio_contado,
         p.precio_3_cuotas,
         p.stock
  FROM productos p
  WHERE p.medida = $medida
    AND ($marca IS NULL OR p.marca ILIKE $marca)
    AND p.stock > 0
  ORDER BY 
    CASE WHEN $marca IS NOT NULL THEN 0 ELSE 1 END,
    p.popularidad DESC
  LIMIT 3
  ```

### actualizar_seguimiento:
- **Endpoint:** PostgreSQL node
- **Upsert en tabla leads:**
  ```sql
  INSERT INTO leads (telefono, notas, estado, updated_at)
  VALUES ($telefono, $nota_con_timestamp, $estado, NOW())
  ON CONFLICT (telefono) 
  DO UPDATE SET 
    notas = leads.notas || E'\n' || $nota_con_timestamp,
    estado = COALESCE($estado, leads.estado),
    updated_at = NOW()
  RETURNING id, notas, estado
  ```

### crear_ticket:
- **Endpoint:** PostgreSQL node + Notificación
- **Insert en tickets:**
  ```sql
  INSERT INTO tickets (lead_id, tipo, descripcion, prioridad, estado, created_at)
  VALUES (
    (SELECT id FROM leads WHERE telefono = $telefono),
    $tipo,
    $descripcion,
    COALESCE($prioridad, 'media'),
    'abierto',
    NOW()
  )
  RETURNING id, tipo, prioridad
  ```

---

## 🎯 VENTAJAS DE ESTA ARQUITECTURA

✅ **Memoria natural** - Las notas son texto plano, fácil de leer por el agente
✅ **Sin schemas complejos** - n8n solo recibe/devuelve JSON simple
✅ **Más robusto** - Si una tool falla, el agente puede seguir conversando
✅ **Fácil debug** - Podés ver exactamente qué tool se llamó y qué devolvió
✅ **No repite preguntas** - Siempre lee las notas antes de responder
✅ **Escalable** - Fácil agregar más tools después

---

## 🚀 SIGUIENTE PASO

Implementar en n8n:
1. Crear los 3 workflows para cada tool
2. Configurar el AI Agent con el prompt v2
3. Conectar con WhatsApp trigger
4. Probar flujo completo

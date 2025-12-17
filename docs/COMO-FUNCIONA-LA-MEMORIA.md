# 🧠 Cómo Funciona la Memoria en n8n

## 🎯 Concepto Clave

**El AI Agent NO tiene memoria entre mensajes.** Por eso, debés leerle la info del lead ANTES de cada respuesta.

---

## 🔄 Flujo Completo

```
┌──────────────────────────────────────────────────────────┐
│  MENSAJE 1: Cliente envía "Hola"                         │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ WhatsApp Trigger     │
        │ Mensaje: "Hola"      │
        │ From: +5491123...    │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────────────────┐
        │ PostgreSQL: Leer Memoria         │
        │ SELECT * FROM leads              │
        │ WHERE telefono = '+5491123...'   │
        └──────────┬───────────────────────┘
                   │
                   ├─→ NO existe (primera vez)
                   │   ↓
                   │   Crear objeto vacío:
                   │   { estado: "nuevo",
                   │     notas: "",
                   │     tipo_vehiculo: null,
                   │     ... }
                   │
                   ▼
        ┌──────────────────────────────────┐
        │ AI Agent                         │
        │                                  │
        │ Context (Memoria):               │
        │   Estado: nuevo                  │
        │   Notas: (vacío)                 │
        │   Vehículo: (no tiene)           │
        │   Medida: (no tiene)             │
        │                                  │
        │ Message: "Hola"                  │
        └──────────┬───────────────────────┘
                   │
                   ├─→ Agente lee memoria
                   │   Ve que es nuevo
                   │
                   ├─→ Responde: Saludo FASE 1
                   │
                   └─→ Llama: actualizar_estado(
                           estado: "nuevo"
                       )
                   ↓
        ┌──────────────────────────────────┐
        │ Tool: actualizar_estado          │
        │ GUARDA en BD:                    │
        │   INSERT/UPDATE leads            │
        │   SET estado = 'nuevo'           │
        │       notas = '17/12 10:00 -     │
        │                Lead creado'      │
        └──────────┬───────────────────────┘
                   │
                   ▼
        ┌──────────────────────────────────┐
        │ WhatsApp: Enviar                 │
        │ "🚗💨 Bienvenido a TopNeum..."   │
        └──────────────────────────────────┘

═══════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────┐
│  MENSAJE 2: Cliente envía "185/60R15 para Gol Trend"    │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ WhatsApp Trigger     │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────────────────┐
        │ PostgreSQL: Leer Memoria         │
        │ SELECT * FROM leads              │
        │ WHERE telefono = '+5491123...'   │
        └──────────┬───────────────────────┘
                   │
                   ├─→ SÍ existe (ya tiene registro)
                   │   ↓
                   │   Devolver datos de BD:
                   │   { estado: "nuevo",
                   │     notas: "17/12 10:00 - Lead...",
                   │     tipo_vehiculo: null,
                   │     medida: null,
                   │     ... }
                   │
                   ▼
        ┌──────────────────────────────────┐
        │ AI Agent                         │
        │                                  │
        │ Context (Memoria): ⭐            │
        │   Estado: nuevo                  │
        │   Notas: "17/12 10:00 - Lead..." │
        │   Vehículo: (aún no tiene)       │
        │   Medida: (aún no tiene)         │
        │                                  │
        │ Message: "185/60R15 para Gol..." │
        └──────────┬───────────────────────┘
                   │
                   ├─→ Agente lee memoria
                   │   Ve que ya es lead activo
                   │   Detecta vehículo y medida
                   │
                   ├─→ Llama: actualizar_estado(
                   │       tipo_vehiculo: "Volkswagen Gol Trend",
                   │       medida_neumatico: "185/60R15",
                   │       estado: "en_conversacion",
                   │       notas: "Cliente consulta 185/60R15..."
                   │   )
                   │
                   ├─→ Llama: buscar_productos(
                   │       medida: "185/60R15",
                   │       marca: null,
                   │       region: "CABA"
                   │   )
                   │
                   └─→ Responde: Cotización
                   ↓
        ┌──────────────────────────────────┐
        │ Tool: actualizar_estado          │
        │ UPDATE leads                     │
        │ SET tipo_vehiculo = 'Gol Trend', │
        │     medida = '185/60R15',        │
        │     estado = 'en_conversacion',  │
        │     notas = notas || '\n17/12... │
        └──────────┬───────────────────────┘
                   │
                   ▼
        ┌──────────────────────────────────┐
        │ WhatsApp: Enviar cotización      │
        └──────────────────────────────────┘

═══════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────┐
│  MENSAJE 3: Cliente envía "¿Cuánto sale?"               │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────────────────┐
        │ PostgreSQL: Leer Memoria         │
        └──────────┬───────────────────────┘
                   │
                   ├─→ Devolver TODA la info:
                   │   { estado: "cotizado",
                   │     tipo_vehiculo: "Gol Trend",
                   │     medida: "185/60R15",
                   │     notas: "17/12 10:00 - Lead...
                   │              17/12 10:05 - Cliente...
                   │              17/12 10:06 - Cotizado...",
                   │     ... }
                   │
                   ▼
        ┌──────────────────────────────────┐
        │ AI Agent                         │
        │                                  │
        │ Context (Memoria): ⭐⭐⭐         │
        │   Estado: cotizado               │
        │   Vehículo: Gol Trend            │
        │   Medida: 185/60R15              │
        │   Notas: "Ya cotizado Pirelli... │
        │            $145k las 4"          │
        │                                  │
        │ Message: "¿Cuánto sale?"         │
        └──────────┬───────────────────────┘
                   │
                   ├─→ Agente lee memoria ✅
                   │   Ve que YA tiene:
                   │   - Vehículo
                   │   - Medida
                   │   - YA cotizó
                   │
                   ├─→ NO pregunta de nuevo ✅
                   │
                   └─→ Responde usando la info:
                       "Para tu Gol Trend en 185/60R15,
                        ya te pasé los precios.
                        El Pirelli sale $145k las 4"
                   ↓
        ┌──────────────────────────────────┐
        │ WhatsApp: Enviar respuesta       │
        └──────────────────────────────────┘
```

---

## 🔑 Puntos Clave

### 1. La memoria NO está en el AI Agent
- El AI Agent es **stateless** (sin estado)
- NO recuerda mensajes anteriores
- Por eso necesitás leerle la BD en cada mensaje

### 2. La memoria ES la base de datos
```
Memoria = SELECT * FROM leads WHERE telefono = '...'
```

### 3. El flujo es siempre el mismo
```
1. Mensaje llega
2. LEER BD (memoria)
3. Pasar memoria como Context al AI Agent
4. Agente responde usando esa memoria
5. Si el agente llama actualizar_estado, se GUARDA en BD
6. Fin del mensaje

(Siguiente mensaje, repetir desde 1)
```

### 4. El Context vs el Message
- **Context:** Memoria del lead (NO visible para el usuario)
- **Message:** El texto que envió el cliente

```
AI Agent recibe:

[CONTEXT]
Memoria:
  Vehículo: Gol Trend
  Medida: 185/60R15
  Estado: cotizado
  
[MESSAGE]
"¿Cuánto sale?"

→ El agente usa ambos para responder
```

---

## 📊 Comparación: Con vs Sin Memoria

### ❌ Sin Memoria (MAL)

```
Cliente: "Hola, necesito cubiertas"
Bot: "Hola! ¿Qué auto tenés?"

Cliente: "Gol Trend"
Bot: "¿Qué medida?"

Cliente: "185/60R15"
Bot: [busca y muestra opciones]

Cliente: "¿Cuánto sale?"
Bot: "¿Para qué medida?" ❌ YA LA DIJO!
```

### ✅ Con Memoria (BIEN)

```
Cliente: "Hola, necesito cubiertas"
Bot: "Hola! ¿Qué auto tenés?"
[Guarda: estado=nuevo]

Cliente: "Gol Trend"
[Lee memoria: estado=nuevo]
Bot: "¿Qué medida?"
[Guarda: tipo_vehiculo="Gol Trend"]

Cliente: "185/60R15"
[Lee memoria: tiene Gol Trend]
Bot: [busca y muestra opciones]
[Guarda: medida="185/60R15", estado="cotizado"]

Cliente: "¿Cuánto sale?"
[Lee memoria: tiene Gol Trend, 185/60R15, YA cotizó]
Bot: "Para tu Gol Trend en 185/60R15, 
     ya te pasé los precios. 
     El Pirelli sale $145k las 4" ✅
```

---

## 🛠️ Implementación en n8n

### Configuración del AI Agent

**1. System Prompt:**
```
[Todo el prompt de prompt-agente-v2.md]
```

**2. Context (MUY IMPORTANTE):**
```
MEMORIA DEL CLIENTE:

Estado: {{ $('Leer Memoria').item.json.estado }}
Vehículo: {{ $('Leer Memoria').item.json.tipo_vehiculo }}
Medida: {{ $('Leer Memoria').item.json.medida_neumatico }}
Marca preferida: {{ $('Leer Memoria').item.json.marca_preferida }}

Notas:
{{ $('Leer Memoria').item.json.notas }}

⚠️ Lee esta memoria ANTES de responder.
NO preguntes lo que ya está aquí.
```

**3. User Message:**
```
{{ $json.body }}
```

---

## ✅ Beneficios

1. **Cero pérdida de contexto** - Todo en BD
2. **Fácil debug** - Ves exactamente qué sabe el agente
3. **Soporta múltiples consultas** - Cliente puede preguntar por varios autos
4. **Persistente** - Si el workflow se cae, la memoria persiste
5. **Auditable** - Podés ver el historial completo en las notas

---

## 🚨 Errores Comunes

### ❌ Error 1: No leer la BD antes del agente
```
WhatsApp Trigger → AI Agent ❌

Problema: El agente no tiene memoria
```

### ✅ Correcto:
```
WhatsApp Trigger → Leer BD → AI Agent ✅
```

### ❌ Error 2: Pasar la memoria como mensaje
```
Message: "{{ $('Leer Memoria').item.json.notas }} {{ $json.body }}" ❌

Problema: El usuario ve su propia memoria en el chat
```

### ✅ Correcto:
```
Context: Memoria
Message: Solo el mensaje del usuario ✅
```

### ❌ Error 3: No guardar después de cada dato
```
Cliente: "Gol Trend"
Bot: "¿Qué medida?"
[NO llamó actualizar_estado] ❌

Siguiente mensaje:
Bot: "¿Qué auto tenés?" ❌ Perdió la info!
```

### ✅ Correcto:
```
Cliente: "Gol Trend"
Bot: Llama actualizar_estado(tipo_vehiculo: "Gol Trend") ✅
Bot: "¿Qué medida?"

Siguiente mensaje:
[Lee memoria: tiene Gol Trend] ✅
Bot: No pregunta de nuevo ✅
```

---

**La memoria es la clave del sistema. Sin ella, el agente es como un pez dorado que olvida todo cada 3 segundos.** 🐠➡️🧠

# 🔄 Ejemplo Práctico: Flujo de Cambio de Estado

## 📝 Caso de Uso: Cliente Consulta Neumáticos

---

## 🎬 Escenario Completo

### **Mensaje 1: Consulta Inicial**

**Input (WhatsApp):**
```
Cliente: Hola, necesito precio de 205/55R16 para mi auto
Teléfono: +54 9 11 1234 5678
```

**Flujo en n8n:**

```
┌─────────────────────────────────────────────────┐
│ 1. Webhook recibe mensaje                       │
│    from: "+54 9 11 1234 5678"                   │
│    text: "Hola, necesito precio de 205/55R16..." │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 2. Function: Detectar Región                    │
│    ✓ Detecta CABA (prefijo +54 9 11)           │
│    Output:                                       │
│    {                                             │
│      telefono_whatsapp: "+54 9 11 1234 5678",  │
│      mensaje_texto: "Hola, necesito...",        │
│      region: "CABA"                             │
│    }                                             │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 3. HTTP Request: Registrar Mensaje Entrante     │
│    POST /api/n8n/registrar-mensaje              │
│    ✓ Mensaje guardado en DB                     │
│    ✓ Trigger crea lead automáticamente:         │
│       - id: uuid-xxx                             │
│       - telefono: "+54 9 11 1234 5678"          │
│       - estado: "conversacion_iniciada"         │
│       - region: "CABA"                           │
│       - whatsapp_label: "en caliente"           │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 4. Agente LLM (GPT-4)                           │
│    System Prompt: [prompt-agente-ventas.md]     │
│    User: "Cliente CABA dice: Hola, necesito..." │
│                                                  │
│    ✓ Agente detecta:                            │
│      - Medida: 205/55R16                        │
│      - Es consulta de producto                  │
│      - Requiere búsqueda en DB                  │
│                                                  │
│    Output JSON:                                  │
│    {                                             │
│      "telefono_whatsapp": "+54 9 11 1234 5678", │
│      "region": "CABA",                           │
│      "estado_actual": "consulta_producto",      │
│      "tipo_interaccion": "consulta",            │
│      "datos_extraidos": {                       │
│        "medida_neumatico": "205/55R16",         │
│        "marca_preferida": null                  │
│      },                                          │
│      "requiere_busqueda_db": true,              │
│      "requiere_ticket_manual": false            │
│    }                                             │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 5. Function: Procesar Respuesta Agente          │
│    ✓ Parsea JSON del agente                     │
│    ✓ Extrae datos clave                         │
│                                                  │
│    Output:                                       │
│    {                                             │
│      telefono_whatsapp: "+54 9 11 1234 5678",  │
│      region: "CABA",                             │
│      estado_nuevo: "consulta_producto",         │
│      estado_anterior: "conversacion_iniciada",  │
│      datos_extraidos: {                         │
│        medida_neumatico: "205/55R16"            │
│      },                                          │
│      requiere_busqueda_db: true                 │
│    }                                             │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 6. IF: ¿Requiere Búsqueda DB?                   │
│    Condición: requiere_busqueda_db === true     │
│    ✓ SÍ → Ir a Buscar Productos                 │
└──────────────────┬──────────────────────────────┘
                   │ TRUE
                   ▼
┌─────────────────────────────────────────────────┐
│ 7. HTTP Request: Buscar Productos               │
│    POST /api/n8n/buscar-neumaticos              │
│    Body:                                         │
│    {                                             │
│      "telefono_whatsapp": "+54 9 11 1234 5678", │
│      "medida_neumatico": "205/55R16",           │
│      "marca": null,                              │
│      "region": "CABA",                           │
│      "tipo_consulta": "cotizacion"              │
│    }                                             │
│                                                  │
│    ✓ Query SQL ejecutado:                       │
│      SELECT * FROM products                      │
│      WHERE medida = '205/55' AND indice = 'R16' │
│                                                  │
│    ✓ Encontrados: 5 productos                   │
│                                                  │
│    Output:                                       │
│    {                                             │
│      "productos": [                              │
│        {                                         │
│          "marca": "HANKOOK",                     │
│          "familia": "OPTIMO",                    │
│          "diseno": "H426",                       │
│          "medida": "205/55",                     │
│          "indice": "R16",                        │
│          "cuota_3": 28500,                       │
│          "cuota_6": 31200,                       │
│          "cuota_12": 35800,                      │
│          "efectivo_bsas_sin_iva": 24000,        │
│          "stock": "SI"                           │
│        },                                        │
│        { ... 4 productos más ... }              │
│      ],                                          │
│      "mensaje": "🔍 Encontramos 5 opciones...",  │
│      "cantidad": 5                               │
│    }                                             │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 8. Function: Cambiar Estado Lead 🔑             │
│    ⚠️ ESTE ES EL NODE CLAVE                     │
│                                                  │
│    Input:                                        │
│    - telefono: "+54 9 11 1234 5678"             │
│    - estadoNuevo: "consulta_producto"           │
│    - productos encontrados: 5                    │
│    - region: "CABA"                              │
│                                                  │
│    Script ejecuta:                               │
│    1. Detecta que pasó de conversacion_iniciada │
│       a consulta_producto                        │
│    2. Calcula totales de precios                 │
│    3. Construye datos_adicionales:              │
│       {                                          │
│         medida_neumatico: "205/55R16",          │
│         cantidad_productos: 5,                   │
│         precio_total_3cuotas: 114000,           │
│         precio_total_contado: 96000             │
│       }                                          │
│                                                  │
│    Output (payload para API):                   │
│    {                                             │
│      "telefono_whatsapp": "+54 9 11 1234 5678", │
│      "nuevo_estado": "consulta_producto",       │
│      "cambiado_por": "agente_llm",              │
│      "datos_adicionales": {                     │
│        "medida_neumatico": "205/55R16",         │
│        "cantidad_productos": 5,                  │
│        "precio_total_3cuotas": 114000,          │
│        "precio_total_contado": 96000            │
│      }                                           │
│    }                                             │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 9. HTTP Request: Actualizar Estado en DB        │
│    POST /api/n8n/actualizar-estado              │
│    Body: {JSON del node anterior}               │
│                                                  │
│    Backend (Next.js) ejecuta:                   │
│    ```sql                                        │
│    SELECT * FROM actualizar_estado_lead(        │
│      '+54 9 11 1234 5678',                      │
│      'consulta_producto'::lead_status,          │
│      '{"medida_neumatico": "205/55R16",...}'    │
│    );                                            │
│    ```                                           │
│                                                  │
│    Función SQL hace:                             │
│    1. ✓ Busca lead por teléfono                 │
│    2. ✓ Guarda estado_anterior: "conversacion_  │
│          iniciada"                               │
│    3. ✓ Actualiza estado: "consulta_producto"  │
│    4. ✓ Determina nuevo label: "en caliente"   │
│    5. ✓ Actualiza ultima_interaccion: NOW()     │
│                                                  │
│    Trigger automático ejecuta:                   │
│    ```sql                                        │
│    INSERT INTO historial_estados (              │
│      lead_id, estado_anterior, estado_nuevo,    │
│      changed_by, datos_adicionales              │
│    ) VALUES (                                    │
│      'uuid-xxx', 'conversacion_iniciada',       │
│      'consulta_producto', 'agente_llm', {...}   │
│    );                                            │
│    ```                                           │
│                                                  │
│    Output (respuesta del endpoint):             │
│    {                                             │
│      "success": true,                            │
│      "mensaje": "Estado actualizado",           │
│      "lead": {                                   │
│        "id": "uuid-xxx",                         │
│        "telefono_whatsapp": "+54 9 11...",      │
│        "estado": "consulta_producto",           │
│        "whatsapp_label": "en caliente",         │
│        "region": "CABA",                         │
│        "ultima_interaccion": "2025-11-08..."    │
│      },                                          │
│      "estado_anterior": "conversacion_iniciada" │
│    }                                             │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 10. Function: Formatear Mensaje WhatsApp        │
│     ✓ Usa mensaje de DB (tiene los productos)   │
│                                                  │
│     Output:                                      │
│     {                                            │
│       telefono_whatsapp: "+54 9 11 1234 5678",  │
│       mensaje_final: "🔍 Encontramos 5 opcio...",│
│       estado_nuevo: "consulta_producto"         │
│     }                                            │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 11. HTTP Request: Registrar Mensaje Saliente    │
│     POST /api/n8n/registrar-mensaje             │
│     ✓ Mensaje guardado en DB                     │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 12. WhatsApp: Enviar Mensaje                    │
│     ✓ Mensaje enviado al cliente                │
└─────────────────────────────────────────────────┘
```

---

## 🔍 Resultado en Base de Datos

### Tabla `leads`
```sql
SELECT * FROM leads WHERE telefono_whatsapp = '+54 9 11 1234 5678';
```

| id | telefono_whatsapp | nombre | estado | whatsapp_label | region | ultima_interaccion |
|----|-------------------|--------|--------|----------------|--------|--------------------|
| uuid-xxx | +54 9 11 1234 5678 | NULL | consulta_producto | en caliente | CABA | 2025-11-08 14:30:00 |

### Tabla `historial_estados`
```sql
SELECT * FROM historial_estados 
WHERE lead_id = 'uuid-xxx' 
ORDER BY changed_at DESC;
```

| id | lead_id | estado_anterior | estado_nuevo | changed_by | datos_adicionales | changed_at |
|----|---------|-----------------|--------------|------------|-------------------|------------|
| 1 | uuid-xxx | conversacion_iniciada | consulta_producto | agente_llm | {"medida_neumatico": "205/55R16", ...} | 2025-11-08 14:30:00 |

### Tabla `mensajes_whatsapp`
```sql
SELECT * FROM mensajes_whatsapp 
WHERE lead_id = 'uuid-xxx' 
ORDER BY timestamp DESC;
```

| id | lead_id | direccion | contenido | enviado_por | timestamp |
|----|---------|-----------|-----------|-------------|-----------|
| 2 | uuid-xxx | saliente | 🔍 Encontramos 5 opciones... | agente_llm | 2025-11-08 14:30:05 |
| 1 | uuid-xxx | entrante | Hola, necesito precio de 205/55R16 | cliente | 2025-11-08 14:30:00 |

---

## 📱 Mensaje Enviado al Cliente

```
🔍 Encontramos 5 opciones para 205/55R16

━━━━━━━━━━━━━━━━━━━━━━
🏆 OPCIÓN 1 - HANKOOK OPTIMO H426
━━━━━━━━━━━━━━━━━━━━━━
📦 Stock: Disponible
💳 3 cuotas: $28.500 (Total: $114.000)
💳 6 cuotas: $31.200 (Total: $124.800)
💳 12 cuotas: $35.800 (Total: $143.200)
💵 PROMO CONTADO CABA: $24.000 (Total: $96.000) ⭐

━━━━━━━━━━━━━━━━━━━━━━
🏆 OPCIÓN 2 - FATE ADVANCE AR-35
━━━━━━━━━━━━━━━━━━━━━━
📦 Stock: Disponible
💳 3 cuotas: $26.000 (Total: $104.000)
💵 PROMO CONTADO CABA: $22.000 (Total: $88.000) ⭐

[... 3 opciones más ...]

💡 ¿Cuál te interesa? También puedo darte más info sobre alguna medida en particular.
```

---

## 🔄 Siguiente Interacción: Cliente Elige Producto

### **Mensaje 2: Elección de Producto**

**Input (WhatsApp):**
```
Cliente: Me interesa el Hankook. Pago en 3 cuotas sin factura
```

**Flujo en n8n:**

```
Webhook → Detectar Región (CABA) → Registrar Mensaje
  ↓
Agente LLM detecta:
  - Cliente eligió: HANKOOK OPTIMO H426
  - Forma de pago: 3 cuotas sin factura
  - estado_nuevo: "en_proceso_de_pago"
  ↓
Function: Cambiar Estado Lead
  ✓ estadoNuevo: "en_proceso_de_pago"
  ✓ datosAdicionales: {
      forma_pago: "3_cuotas_sin_factura",
      productos: [{
        marca: "HANKOOK",
        modelo: "OPTIMO H426",
        medida: "205/55R16",
        cantidad: 4,
        precio_unitario: 28500
      }],
      subtotal: 114000,
      descuento_porcentaje: 10,
      total: 102600
    }
  ↓
HTTP Request: Actualizar Estado
  ✓ Estado cambiado: "en_proceso_de_pago"
  ✓ Label actualizado: "pedido en espera de pago"
  ✓ Trigger registra en historial
  ↓
Respuesta al cliente:
  "¡Perfecto! Tu pedido:
   4 Neumáticos HANKOOK OPTIMO H426 205/55R16
   3 cuotas sin factura: $34.200 c/u
   Total: $102.600
   
   🎯 Para confirmar necesito una seña del 30%: $30.780
   
   📲 Alias: topneum.mp
   💳 CBU: 0000003100012345678901
   
   Cuando hagas la transferencia, enviame el comprobante!"
```

### Resultado en DB:

**Tabla `leads`:**
- estado: `en_proceso_de_pago`
- whatsapp_label: `pedido en espera de pago`

**Tabla `historial_estados`:**
| estado_anterior | estado_nuevo | changed_by | changed_at |
|----------------|--------------|------------|------------|
| consulta_producto | en_proceso_de_pago | agente_llm | 2025-11-08 14:45:00 |
| conversacion_iniciada | consulta_producto | agente_llm | 2025-11-08 14:30:00 |

---

## ✅ Resumen del Flujo de Cambio de Estado

### Lo que hace el **Function Node "Cambiar Estado Lead"**:

1. ✅ **Recibe datos** del agente LLM
2. ✅ **Detecta el nuevo estado** basado en la interacción
3. ✅ **Prepara datos adicionales** según el tipo de estado
4. ✅ **Construye el payload** para la API
5. ✅ **Valida** que todos los campos requeridos estén presentes
6. ✅ **Retorna el payload** al siguiente node (HTTP Request)

### Lo que hace el **HTTP Request "Actualizar Estado"**:

1. ✅ **Llama al endpoint** `/api/n8n/actualizar-estado`
2. ✅ **Endpoint ejecuta función SQL** `actualizar_estado_lead()`
3. ✅ **Función SQL actualiza** el lead en la tabla
4. ✅ **Trigger automático registra** el cambio en `historial_estados`
5. ✅ **Trigger automático actualiza** el `whatsapp_label`
6. ✅ **Retorna confirmación** con el lead actualizado

---

## 📊 Diagrama de Estados Completo

```
conversacion_iniciada (en caliente)
         ↓
    (cliente consulta medida)
         ↓
consulta_producto (en caliente)
         ↓
    (agente envía cotización)
         ↓
cotizacion_enviada (en caliente)
         ↓
    (cliente elige forma de pago)
         ↓
en_proceso_de_pago (pedido en espera de pago)
         ↓
    (CRM confirma pago)
         ↓
pagado (pagado)
         ↓
    (cliente elige envío/colocación)
         ↓
turno_pendiente (pagado)
         ↓
    (cliente confirma fecha/hora)
         ↓
turno_agendado (pagado)
         ↓
    (pedido enviado o colocación realizada)
         ↓
pedido_finalizado (pedido finalizado)
```

---

**🎯 Con este flujo, cada interacción del cliente actualiza automáticamente el estado del lead y queda registrada en el historial!**

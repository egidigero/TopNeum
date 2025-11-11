# 🤖 Tools para Agente LLM en n8n

## 📋 Descripción

El agente LLM de n8n tiene acceso a 2 herramientas (tools) que puede usar según la conversación:

1. **`buscar_productos`** - Busca neumáticos en la base de datos
2. **`actualizar_estado`** - Actualiza el estado del lead y registra tracking

---

## 🔧 Tool 1: `buscar_productos`

### Propósito
Buscar neumáticos en la base de datos según medida y marca.

### Cuándo usarlo
- Cliente consulta por una medida específica
- Cliente pide precios
- Cliente quiere ver opciones disponibles

### Input Schema (JSON)
```json
{
  "type": "object",
  "properties": {
    "medida_neumatico": {
      "type": "string",
      "description": "Medida del neumático en formato 205/55R16 o 205/55/R16"
    },
    "marca": {
      "type": "string",
      "description": "Marca preferida (HANKOOK, FATE, FIRESTONE, etc). Opcional."
    },
    "region": {
      "type": "string",
      "enum": ["CABA", "INTERIOR"],
      "description": "Región del cliente (CABA si teléfono empieza con +54 9 11, sino INTERIOR)"
    }
  },
  "required": ["medida_neumatico", "region"]
}
```

### Ejemplo de uso por el agente
```json
{
  "medida_neumatico": "205/55R16",
  "marca": null,
  "region": "CABA"
}
```

### Output esperado
```json
{
  "productos": [
    {
      "marca": "HANKOOK",
      "familia": "OPTIMO",
      "diseno": "H426",
      "medida": "205/55",
      "indice": "R16",
      "cuota_3": 28500,
      "cuota_6": 31200,
      "cuota_12": 35800,
      "efectivo_bsas_sin_iva": 24000,
      "efectivo_interior_sin_iva": 25200,
      "stock": "SI",
      "sku": "HK-OPT-H426-20555R16"
    }
  ],
  "mensaje": "🔍 Encontramos 5 opciones para 205/55R16:\n\n━━━━━━━━━━━━━━━━━━━━━━\n🏆 OPCIÓN 1 - HANKOOK OPTIMO H426\n━━━━━━━━━━━━━━━━━━━━━━\n📦 Stock: Disponible\n💳 3 cuotas: $28.500 (Total: $114.000)\n💳 6 cuotas: $31.200 (Total: $124.800)\n💳 12 cuotas: $35.800 (Total: $143.200)\n💵 PROMO CONTADO CABA: $24.000 (Total: $96.000) ⭐\n\n...",
  "cantidad": 5,
  "medida_buscada": "205/55R16",
  "region": "CABA"
}
```

### Configuración en n8n

**Node Type:** `HTTP Request`
**Nombre:** `buscar_productos`

**Configuración:**
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
  "body": "={{$json}}"
}
```

**Conectar a:** Agente LLM como Tool

---

## 🔧 Tool 2: `actualizar_estado`

### Propósito
Actualizar el estado del lead en la base de datos y registrar el tracking de la conversación.

**⚠️ IMPORTANTE:** Si el lead no existe, esta herramienta lo **crea automáticamente** en la primera llamada. Un trigger en la base de datos se encarga de esto.

### Cuándo usarlo
- Cliente pasó a una nueva etapa (consultó producto, recibió cotización, eligió pago, etc)
- Hay datos nuevos importantes para registrar
- Se completó una acción específica (envió cotización, cliente eligió producto, etc)

### Input Schema (JSON)
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
        "nuevo",
        "en_conversacion",
        "cotizado",
        "esperando_pago",
        "pago_informado",
        "pedido_confirmado",
        "perdido"
      ],
      "description": "Nuevo estado del lead según la etapa de la conversación. Estados: nuevo (recién creado), en_conversacion (charlando), cotizado (envió precios), esperando_pago (cliente debe pagar, tiene código), pago_informado (cliente dice que pagó), pedido_confirmado (pago verificado, va a Pedidos), perdido (descartado)"
    },
    "datos_adicionales": {
      "type": "object",
      "description": "Datos relevantes de esta etapa (medida consultada, productos elegidos, forma de pago, etc)"
    },
    "datos_cliente": {
      "type": "object",
      "description": "NUEVO: Datos personales del cliente que se pueden actualizar (email, dni, direccion, localidad, provincia, codigo_postal). Estos se guardan en la tabla leads y son editables desde el CRM",
      "properties": {
        "email": {"type": "string", "description": "Email del cliente"},
        "dni": {"type": "string", "description": "DNI del cliente"},
        "direccion": {"type": "string", "description": "Dirección (calle y número)"},
        "localidad": {"type": "string", "description": "Ciudad/localidad"},
        "provincia": {"type": "string", "description": "Provincia"},
        "codigo_postal": {"type": "string", "description": "Código postal"}
      }
    }
  },
  "required": ["telefono_whatsapp", "nuevo_estado"]
}
```

### Flujo de Estados (Actualizado)

```
nuevo → en_conversacion → cotizado → esperando_pago → pago_informado → pedido_confirmado
                                                                              ↓
                                                                          (Va a Pedidos)
                                          ↓
                                       perdido (en cualquier momento)
```

**Detalles de cada estado:**
- **nuevo**: Lead recién creado, sin interacción real
- **en_conversacion**: Cliente está consultando, conversación activa
- **cotizado**: Ya se envió cotización con precios
- **esperando_pago**: Cliente debe pagar (se genera código de confirmación automático)
- **pago_informado**: Cliente informó que pagó (pendiente verificación del vendedor)
- **pedido_confirmado**: Pago verificado, lead aparece en sección "Pedidos" del CRM
- **perdido**: Lead descartado (no responde, no le interesa, etc)

### Ejemplos de uso por el agente

**Ejemplo 1: Cliente consultó medida**
```json
{
  "telefono_whatsapp": "+54 9 11 1234 5678",
  "nuevo_estado": "en_conversacion",
  "datos_adicionales": {
    "medida_neumatico": "205/55R16",
    "marca_preferida": null,
    "tipo_vehiculo": "auto"
  }
}
```
**⚠️ Si es la primera vez de este teléfono, el trigger crea el lead automáticamente con estado "nuevo".**

**Ejemplo 2: Se envió cotización**
```json
{
  "telefono_whatsapp": "+54 9 11 1234 5678",
  "nuevo_estado": "cotizado",
  "datos_adicionales": {
    "medida_cotizada": "205/55R16",
    "cantidad_opciones": 5,
    "marcas_mostradas": ["HANKOOK", "FATE", "FIRESTONE"],
    "precio_desde": 24000,
    "precio_hasta": 35800
  }
}
```

**Ejemplo 3: Cliente eligió forma de pago (NUEVO: se genera código automáticamente)**
```json
{
  "telefono_whatsapp": "+54 9 11 1234 5678",
  "nuevo_estado": "esperando_pago",
  "datos_adicionales": {
    "producto_elegido": {
      "marca": "HANKOOK",
      "modelo": "OPTIMO H426",
      "medida": "205/55R16"
    },
    "forma_pago": "3_cuotas_sin_factura",
    "cantidad": 4,
    "precio_unitario": 28500,
    "total": 114000,
    "descuento": 10,
    "total_final": 102600
  }
}
```
**✨ Al pasar a "esperando_pago", se genera un `codigo_confirmacion` único (ej: "TOP123") que el cliente usará para agendar turno.**

**Ejemplo 4: Cliente informó que pagó**
```json
{
  "telefono_whatsapp": "+54 9 11 1234 5678",
  "nuevo_estado": "pago_informado",
  "datos_adicionales": {
    "metodo_pago": "transferencia",
    "fecha_informada": "2025-11-11",
    "comprobante_enviado": true
  }
}
```
**🔔 El vendedor verá este lead en estado "pago_informado" y podrá confirmar el pago desde el CRM.**

**Ejemplo 5: NUEVO - Recopilar datos del cliente**
```json
{
  "telefono_whatsapp": "+54 9 11 1234 5678",
  "nuevo_estado": "en_conversacion",
  "datos_cliente": {
    "email": "juan@example.com",
    "dni": "12345678",
    "direccion": "Av. Corrientes 1234",
    "localidad": "Buenos Aires",
    "provincia": "Buenos Aires",
    "codigo_postal": "1043"
  }
}
```
**✨ NUEVO: Estos datos se guardan en la tabla `leads` y son editables desde el panel del CRM. El vendedor puede completarlos o corregirlos manualmente.**

### Output esperado
```json
{
  "success": true,
  "mensaje": "Estado actualizado correctamente",
  "lead": {
    "id": "uuid-xxx",
    "telefono_whatsapp": "+54 9 11 1234 5678",
    "estado": "cotizado",
    "region": "CABA",
    "ultima_interaccion": "2025-11-09T10:30:00Z",
    "email": "juan@example.com",
    "dni": "12345678"
  },
  "estado_anterior": "en_conversacion"
}
```
**✨ Si el lead pasó a "esperando_pago", el response incluirá `codigo_confirmacion`:**
```json
{
  "success": true,
  "mensaje": "Estado actualizado correctamente. Código de confirmación generado: TOP123",
  "lead": {
    "id": "uuid-xxx",
    "estado": "esperando_pago",
    "codigo_confirmacion": "TOP123"
  }
}
```

### Configuración en n8n

**Node Type:** `HTTP Request`
**Nombre:** `actualizar_estado`

**Configuración:**
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
  "body": "={{$json}}"
}
```

**Conectar a:** Agente LLM como Tool

---

## 📊 Estados y sus Labels de WhatsApp

| Estado | Label WhatsApp | Cuándo usar |
|--------|---------------|-------------|
| `conversacion_iniciada` | `en caliente` | Primer mensaje del cliente |
| `consulta_producto` | `en caliente` | Cliente pregunta por medida específica |
| `cotizacion_enviada` | `en caliente` | Ya se enviaron precios/opciones |
| `en_proceso_de_pago` | `pedido en espera de pago` | Cliente eligió producto y forma de pago |
| `pagado` | `pagado` | Pago confirmado (se hace desde CRM) |
| `turno_pendiente` | `pagado` | Cliente eligió envío/colocación |
| `turno_agendado` | `pagado` | Se confirmó fecha y hora |
| `pedido_enviado` | `pedido finalizado` | Pedido despachado |
| `pedido_finalizado` | `pedido finalizado` | Entregado o colocado |

---

## 🎯 Flujo de Estados Recomendado

```
1. conversacion_iniciada
   ↓ (cliente consulta medida)
2. consulta_producto
   ↓ (agente llama tool buscar_productos)
   ↓ (agente envía cotización)
3. cotizacion_enviada
   ↓ (cliente elige forma de pago)
4. en_proceso_de_pago
   ↓ (CRM confirma pago - manual)
5. pagado
   ↓ (cliente elige envío/colocación)
6. turno_pendiente
   ↓ (se confirma fecha/hora)
7. turno_agendado
   ↓ (pedido despachado/colocado)
8. pedido_finalizado
```

---

## 🔄 Configuración del Agente LLM en n8n

### Node Type: `OpenAI` / `Anthropic`

**Model:** `gpt-4-turbo` o `claude-3-5-sonnet-20241022`

**System Message:** Ver `docs/prompt-agente-con-tools.md` (creado a continuación)

**Tools:** 
1. Conectar node `buscar_productos` (HTTP Request)
2. Conectar node `actualizar_estado` (HTTP Request)

**Input:**
```
Región: {{$node['Detectar Región'].json.region}}
Teléfono: {{$node['Detectar Región'].json.telefono_whatsapp}}
Mensaje del cliente: "{{$node['Detectar Región'].json.mensaje_texto}}"
```

---

## 📝 Workflow Simplificado en n8n

```
┌────────────────┐
│ Webhook        │
│ (WhatsApp)     │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Function:      │
│ Detectar       │
│ Región         │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Agente LLM     │◄─── Tool 1: buscar_productos (HTTP Request)
│ con Tools      │◄─── Tool 2: actualizar_estado (HTTP Request)
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Enviar         │
│ WhatsApp       │
└────────────────┘
```

**¡Mucho más simple!** El agente decide cuándo usar cada tool.

---

## 🧪 Ejemplos de Conversación

### Ejemplo 1: Consulta de Producto

**Cliente:** "Hola, necesito precio de 205/55R16"

**Agente internamente:**
1. ✅ Detecta que necesita buscar productos
2. 🔧 Llama tool `buscar_productos`:
   ```json
   {
     "telefono_whatsapp": "+54 9 11 1234 5678",
     "medida_neumatico": "205/55R16",
     "region": "CABA",
     "tipo_consulta": "cotizacion"
   }
   ```
3. ✅ Recibe resultados (5 productos)
4. 🔧 Llama tool `actualizar_estado`:
   ```json
   {
     "telefono_whatsapp": "+54 9 11 1234 5678",
     "nuevo_estado": "consulta_producto",
     "datos_adicionales": {
       "medida_neumatico": "205/55R16"
     }
   }
   ```
5. 💬 Responde al cliente con las opciones
6. 🔧 Llama tool `actualizar_estado` nuevamente:
   ```json
   {
     "telefono_whatsapp": "+54 9 11 1234 5678",
     "nuevo_estado": "cotizacion_enviada",
     "datos_adicionales": {
       "cantidad_opciones": 5,
       "medida_cotizada": "205/55R16"
     }
   }
   ```

**Cliente recibe:** Listado de 5 neumáticos con precios

---

### Ejemplo 2: Cliente Elige Producto

**Cliente:** "Me interesa el Hankook, pago en 3 cuotas sin factura"

**Agente internamente:**
1. ✅ Detecta que cliente eligió producto y forma de pago
2. 🔧 Llama tool `actualizar_estado`:
   ```json
   {
     "telefono_whatsapp": "+54 9 11 1234 5678",
     "nuevo_estado": "en_proceso_de_pago",
     "datos_adicionales": {
       "producto_elegido": {
         "marca": "HANKOOK",
         "modelo": "OPTIMO H426",
         "medida": "205/55R16"
       },
       "forma_pago": "3_cuotas_sin_factura",
       "cantidad": 4,
       "total": 102600
     }
   }
   ```
3. 💬 Responde al cliente con datos del pedido y link de pago

**Cliente recibe:** Confirmación del pedido con link de MercadoPago o datos para transferencia

---

## ✅ Ventajas de este Enfoque

✅ **Más simple**: El agente decide cuándo usar cada tool
✅ **Más flexible**: El agente puede llamar múltiples tools en una conversación
✅ **Menos nodes**: No necesitás IF nodes ni Function nodes intermedios
✅ **Mejor tracking**: Cada cambio de estado queda registrado automáticamente
✅ **Natural**: El agente usa las tools como un humano usaría las herramientas

---

## 📋 Checklist de Implementación

### Backend (ya lo tenés)
- [x] Endpoint `/api/n8n/buscar-neumaticos`
- [x] Endpoint `/api/n8n/actualizar-estado`

### n8n (lo que necesitás armar)
- [ ] Node: Webhook (recibe WhatsApp)
- [ ] Node: Function "Detectar Región"
- [ ] Node: Agente LLM (GPT-4/Claude)
- [ ] Node: HTTP Request "buscar_productos" (conectado como tool)
- [ ] Node: HTTP Request "actualizar_estado" (conectado como tool)
- [ ] Node: Enviar WhatsApp

### Documentación
- [ ] Leer `docs/prompt-agente-con-tools.md` (siguiente archivo)
- [ ] Copiar prompt al System Message del agente

---

**Siguiente paso:** Ver `docs/prompt-agente-con-tools.md` para el prompt completo que explica al agente cómo usar estas tools.

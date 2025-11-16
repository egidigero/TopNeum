# 🛠️ SCHEMAS DE TOOLS PARA N8N

**Versión:** Real (basada en implementación actual)  
**Fecha:** 16 Noviembre 2025

---

## TOOL 1: `buscar_productos`

**Endpoint:** `POST https://top-neum-h5x5.vercel.app/api/n8n/buscar-neumaticos`

**Headers:**
```json
{
  "x-api-key": "TU_API_KEY",
  "Content-Type": "application/json"
}
```

**Schema para AI Agent:**
```json
{
  "name": "buscar_productos",
  "description": "Busca productos de neumáticos en el catálogo por medida. SIEMPRE usar antes de crear un pedido para validar que el producto existe. Devuelve lista de productos con precios según región y un mensaje formateado listo para enviar al cliente por WhatsApp.",
  "parameters": {
    "type": "object",
    "properties": {
      "telefono_whatsapp": {
        "type": "string",
        "description": "Número de WhatsApp del cliente (para tracking). Se normaliza automáticamente. Ejemplos: '+5491123456789', '5491123456789', '1123456789'. REQUERIDO."
      },
      "medida_neumatico": {
        "type": "string",
        "description": "Medida del neumático en formato estándar. Ejemplos: '185/60R15', '205/55R16', '265/65R17'. REQUERIDO. Ya normalizado por el agente."
      },
      "marca": {
        "type": "string",
        "description": "Marca de neumático para filtrar resultados (opcional). Si se especifica, los productos de esa marca aparecen primero. Ejemplos: 'PIRELLI', 'MICHELIN', 'BRIDGESTONE', 'FATE', 'HANKOOK'. Null o vacío si no menciona marca."
      },
      "region": {
        "type": "string",
        "enum": ["CABA", "INTERIOR"],
        "description": "Región del cliente para mostrar precios correctos. REQUERIDO. 'CABA' si el teléfono es +5491111xxxx o +549115xxxx, caso contrario 'INTERIOR'."
      },
      "tipo_consulta": {
        "type": "string",
        "enum": ["busqueda_general", "consulta_precio", "consulta_stock", "consulta_general"],
        "description": "Tipo de consulta del cliente (opcional). Por defecto 'busqueda_general'. Usar 'consulta_general' si cliente NO menciona medida específica."
      }
    },
    "required": ["telefono_whatsapp", "medida_neumatico", "region"]
  }
}
```

**Body del Request:**
```json
{
  "telefono_whatsapp": "+5491123456789",
  "medida_neumatico": "185/60R15",
  "marca": "PIRELLI",
  "region": "CABA",
  "tipo_consulta": "busqueda_general"
}
```

**Response:**
```json
{
  "productos": [
    {
      "marca": "PIRELLI",
      "familia": "P400",
      "diseno": "EVO",
      "medida": "185/60R15",
      "indice": "88H",
      "cuota_3": 28500,
      "cuota_6": 31200,
      "cuota_12": 35800,
      "efectivo_bsas_sin_iva": 24000,
      "efectivo_int_sin_iva": 25000,
      "stock": "OK",
      "sku": "PIR12345"
    }
  ],
  "mensaje": "🔍 Encontramos 5 opciones para 185/60R15:\n\n━━━━━━━━━━━━━━━━━\n\n*1. 185/60R15 88H PIRELLI EVO*\n💵 CONTADO CABA: *$24.000* ⭐\n💳 3 CUOTAS: *$28.500*\n📦 ✅ Disponible\n\n...",
  "cantidad": 5,
  "medida_buscada": "185/60R15",
  "marca_buscada": "PIRELLI",
  "region": "CABA",
  "tipo": "busqueda_general"
}
```

---

## TOOL 2: `actualizar_estado`

**Endpoint:** `POST https://top-neum-h5x5.vercel.app/api/n8n/actualizar-estado`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Schema para AI Agent:**
```json
{
  "name": "actualizar_estado",
  "description": "Actualiza el estado del lead en el CRM y registra información del cliente. Usar después de cada interacción importante: cuando cliente menciona datos (nombre, vehículo, medida, marca), cuando se envían precios, cuando elige producto. Si es la primera interacción, crea el lead automáticamente. Soporta múltiples consultas, cotizaciones y productos (no destructivo, acumula datos).",
  "parameters": {
    "type": "object",
    "properties": {
      "telefono_whatsapp": {
        "type": "string",
        "description": "Número de WhatsApp del cliente. REQUERIDO. Se normaliza automáticamente. Ejemplos: '+5491123456789', '5491123456789', '1123456789'."
      },
      "nombre": {
        "type": "string",
        "description": "Nombre completo del cliente. Ejemplos: 'Juan Pérez', 'María González'. Se guarda en leads.nombre_cliente. Opcional. Guardar cuando cliente se presenta o menciona su nombre."
      },
      "notas": {
        "type": "string",
        "description": "Notas o comentarios sobre la interacción con el cliente. Se agregan con timestamp automático a leads.notas. Ejemplos: 'Cliente pregunta por descuentos', 'Mencionó que necesita urgente', 'Compró antes en 2024'. Opcional. Usar para tracking importante que no entra en otros campos."
      },
      "nuevo_estado": {
        "type": "string",
        "enum": ["nuevo", "en_conversacion", "cotizado", "esperando_pago", "pago_informado", "pedido_confirmado", "perdido"],
        "description": "Nuevo estado del lead. OPCIONAL (si no se envía, se mantiene estado actual, excepto si se envía producto_descripcion entonces pasa automáticamente a 'esperando_pago'). Estados: 'nuevo'=primera interacción, 'en_conversacion'=recolectando datos, 'cotizado'=envió precios, 'esperando_pago'=eligió producto (genera código confirmación), 'pago_informado'=cliente envió comprobante, 'pedido_confirmado'=SOLO ADMIN, 'perdido'=no continuó."
      },
      "cambiado_por": {
        "type": "string",
        "description": "Quién hizo el cambio. Por defecto 'agente_llm'. Opcional.",
        "default": "agente_llm"
      },
      "tipo_vehiculo": {
        "type": "string",
        "description": "Modelo del vehículo del cliente. Ejemplos: 'Chevrolet Corsa', 'Toyota Hilux', 'Volkswagen Gol'. Se guarda en lead_consultas. Opcional. Guardar cuando cliente lo menciona. Soporta múltiples consultas (se acumulan, no se sobrescriben)."
      },
      "medida_neumatico": {
        "type": "string",
        "description": "Medida del neumático que necesita el cliente. Ejemplos: '185/60R15', '205/55R16'. Se guarda en lead_consultas. Opcional. Guardar cuando cliente la menciona. Soporta múltiples consultas (se acumulan, no se sobrescriben)."
      },
      "marca_preferida": {
        "type": "string",
        "description": "Marca de neumático que el cliente prefiere. Ejemplos: 'Pirelli', 'Michelin', 'Bridgestone'. Se guarda en lead_consultas. Opcional. Guardar cuando cliente la menciona. Soporta múltiples consultas (se acumulan, no se sobrescriben)."
      },
      "producto_descripcion": {
        "type": "string",
        "description": "Descripción COMPLETA del producto que el cliente eligió. USAR DATOS EXACTOS DE buscar_productos. Formato: 'MARCA MODELO MEDIDA'. Ejemplo: 'PIRELLI P400 EVO 185/60R15'. Para pedidos con múltiples productos, separar con ' + '. Ejemplo: 'PIRELLI P400 EVO 185/60R15 + BRIDGESTONE DUELER HT 265/65R17'. Se guarda en lead_pedidos. Opcional. ⚠️ Si se envía este campo SIN nuevo_estado, el sistema AUTOMÁTICAMENTE cambia el estado a 'esperando_pago'."
      },
      "forma_pago_detalle": {
        "type": "string",
        "description": "Forma de pago CON DETALLE que eligió el cliente. Ejemplos: '3 cuotas: $28.500', 'Transferencia: $96.000', 'Efectivo sin factura: $96.000'. Se guarda en lead_pedidos. Opcional. Usar cuando cliente elige forma de pago."
      },
      "cantidad": {
        "type": "number",
        "description": "Cantidad TOTAL de neumáticos que necesita el cliente (suma de todos los productos). Ejemplos: 2, 4, 12. Se guarda en lead_pedidos. Opcional. Por defecto 4 si no se especifica. ⚠️ SIEMPRE PREGUNTAR al cliente cuántos necesita, NO asumir. Para pedidos múltiples, sumar todas las cantidades."
      },
      "precio_final": {
        "type": "number",
        "description": "Precio total final del pedido. CALCULAR: suma de (precio_unitario × cantidad) de todos los productos. Ejemplo: si producto1=28500×4 y producto2=65000×4, entonces precio_final=114000+260000=374000. Se guarda en lead_pedidos. Opcional. Usar PRECIO EXACTO de buscar_productos."
      },
      "datos_cliente": {
        "type": "object",
        "description": "Datos adicionales del cliente (email, DNI, dirección, etc). Opcional. Solo capturar si el cliente los menciona naturalmente durante la conversación.",
        "properties": {
          "email": "string - Email del cliente",
          "dni": "string - DNI del cliente",
          "direccion": "string - Dirección completa (calle y número)",
          "localidad": "string - Ciudad/Localidad",
          "provincia": "string - Provincia",
          "codigo_postal": "string - Código postal"
        }
      }
    },
    "required": ["telefono_whatsapp"]
  }
}
```

**Body del Request (Ejemplo 1 - Recolectar datos con nombre):**
```json
{
  "telefono_whatsapp": "+5491123456789",
  "nombre": "Juan Pérez",
  "nuevo_estado": "en_conversacion",
  "tipo_vehiculo": "Chevrolet Corsa",
  "medida_neumatico": "185/60R15",
  "marca_preferida": "Pirelli"
}
```

**Body del Request (Ejemplo 1b - Con notas):**
```json
{
  "telefono_whatsapp": "+5491123456789",
  "nombre": "María González",
  "notas": "Cliente menciona que compró hace 2 años y quedó conforme. Pregunta por descuento.",
  "tipo_vehiculo": "Toyota Corolla",
  "medida_neumatico": "195/65R15"
}
```

**Body del Request (Ejemplo 2 - Solo cambiar estado):**
```json
{
  "telefono_whatsapp": "+5491123456789",
  "nuevo_estado": "cotizado"
}
```

**Body del Request (Ejemplo 3 - Crear pedido simple):**
```json
{
  "telefono_whatsapp": "+5491123456789",
  "producto_descripcion": "PIRELLI P400 EVO 185/60R15",
  "forma_pago_detalle": "3 cuotas: $28.500",
  "cantidad": 4,
  "precio_final": 114000
}
```

**⚠️ IMPORTANTE - CANTIDAD:**
- NUNCA enviar cantidad sin que el cliente la haya especificado explícitamente
- SIEMPRE preguntar: "¿Cuántas cubiertas necesitás?"
- NO asumir 4 por defecto
- Si cliente dice "un juego" o "todas", preguntar: "¿Son las 4?"

**Body del Request (Ejemplo 4 - Crear pedido con múltiples productos):**
```json
{
  "telefono_whatsapp": "+5491123456789",
  "producto_descripcion": "PIRELLI P400 EVO 185/60R15 + BRIDGESTONE DUELER HT 265/65R17 + FATE ADVANCE AR-35 205/55R16",
  "forma_pago_detalle": "3 cuotas: $85.333",
  "cantidad": 12,
  "precio_final": 512000
}
```

**NOTA:** Cuando se envía `producto_descripcion` sin `nuevo_estado`, el sistema automáticamente cambia el estado a `esperando_pago` y genera el código de confirmación.

**Response:**
```json
{
  "success": true,
  "lead_id": "uuid",
  "estado_anterior": "en_conversacion",
  "estado_nuevo": "esperando_pago",
  "codigo_confirmacion": "TOP123",
  "nombre_cliente": "Juan Pérez",
  "region": "CABA",
  "datos_recolectados": {
    "nombre": "Juan Pérez",
    "tipo_vehiculo": "Chevrolet Corsa",
    "medida_neumatico": "185/60R15",
    "marca_preferida": "Pirelli",
    "notas": "Cliente menciona que compró hace 2 años"
  },
  "timestamp": "2025-11-16T10:00:00Z"
}
```

**⚠️ NOTA:** Campo `whatsapp_label` fue removido (ya no existe en BD). El response ahora devuelve `codigo_confirmacion` que se genera automáticamente cuando el estado cambia a `esperando_pago`.

---

## TOOL 3: `crear_ticket`

**Endpoint:** `POST https://top-neum-h5x5.vercel.app/api/tools/crear_ticket`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Schema para AI Agent:**
```json
{
  "name": "crear_ticket",
  "description": "Crea un ticket de soporte para consultas que requieren atención humana. Usar cuando: cliente pregunta por Michelin o BF Goodrich (marca_especial - bajo pedido), medida no disponible (buscar_productos devuelve 0 resultados), consulta técnica compleja, problema de pago, reclamo. El equipo contactará al cliente en 2-4 horas (alta prioridad) o 24-48hs (media/baja prioridad). Si el lead no existe, se crea automáticamente.",
  "parameters": {
    "type": "object",
    "properties": {
      "telefono_whatsapp": {
        "type": "string",
        "description": "Número de WhatsApp del cliente. REQUERIDO. Se normaliza automáticamente. Ejemplos: '+5491123456789', '5491123456789'."
      },
      "tipo": {
        "type": "string",
        "enum": ["marca_especial", "medida_no_disponible", "consulta_tecnica", "problema_pago", "confirmacion_pago", "pago_cuotas", "reclamo", "otro"],
        "description": "Tipo de ticket. REQUERIDO. 'marca_especial' para consultas de Michelin o BF Goodrich (marcas bajo pedido). 'medida_no_disponible' si buscar_productos devolvió 0 resultados. 'consulta_tecnica' para dudas sobre compatibilidad o especificaciones. 'problema_pago' para issues con transferencias. 'confirmacion_pago' cuando cliente envía comprobante (URGENTE). 'pago_cuotas' cuando cliente elige cuotas (URGENTE). 'reclamo' para quejas del cliente (URGENTE). 'otro' para casos que no entran en las categorías anteriores."
      },
      "descripcion": {
        "type": "string",
        "description": "Descripción COMPLETA del ticket. REQUERIDO. DEBE incluir: nombre del cliente (si lo tenés), medida consultada, vehículo, qué preguntó el cliente exactamente, región (CABA/INTERIOR), fecha y hora de la consulta. El equipo debe entender el caso completo sin leer todo el chat. Ejemplo: 'Cliente María González consulta Michelin Primacy 185/60R15 para Volkswagen Gol. Preguntó si hay stock inmediato y cuánto demora la entrega. Cliente en Rosario (INTERIOR). Última interacción: 16/11/2025 10:45'"
      },
      "prioridad": {
        "type": "string",
        "enum": ["baja", "media", "alta", "urgente"],
        "description": "Prioridad del ticket. Por defecto 'media'. Usar 'alta' para consultas de Michelin/BF Goodrich o medidas especiales (respuesta en 2-4hs). Usar 'urgente' para reclamos graves o cliente muy molesto (respuesta inmediata). Usar 'baja' para consultas generales o seguimiento normal (respuesta en 24-48hs). Usar 'media' para casos estándar.",
        "default": "media"
      }
    },
    "required": ["telefono_whatsapp", "tipo", "descripcion"]
  }
}
```

**Body del Request:**
```json
{
  "telefono_whatsapp": "+5491123456789",
  "tipo": "marca_especial",
  "descripcion": "Cliente María González consulta Michelin Primacy 185/60R15 para Volkswagen Gol. Preguntó si hay stock inmediato y precio. Cliente en Rosario (INTERIOR). Última interacción: 16/11/2025 10:45",
  "prioridad": "alta"
}
```

**Ejemplo - Medida no disponible:**
```json
{
  "telefono_whatsapp": "+5491123456789",
  "tipo": "medida_no_disponible",
  "descripcion": "Cliente solicita medida 245/70R16 para Toyota Hilux. Medida no disponible en stock actual. Cliente en CABA. Última interacción: 16/11/2025 11:20",
  "prioridad": "media"
}
```

**Ejemplo - Confirmación de pago URGENTE:**
```json
{
  "telefono_whatsapp": "+5491123456789",
  "tipo": "confirmacion_pago",
  "descripcion": "Cliente Juan Pérez envió comprobante de transferencia. PEDIDO: YOKOHAMA BLUEARTH 185/60R15 (4 unidades) - TOTAL: $96.000. REQUIERE VALIDACIÓN URGENTE para liberar turno de colocación",
  "prioridad": "urgente"
}
```

**Response:**
```json
{
  "success": true,
  "ticket_id": "uuid",
  "lead_id": "uuid",
  "telefono_whatsapp": "+5491123456789",
  "tipo": "marca_especial",
  "descripcion": "Cliente María González consulta Michelin...",
  "prioridad": "alta",
  "estado": "abierto",
  "created_at": "2025-11-16T10:20:00Z"
}
```

---

## 📋 RESUMEN DE IMPLEMENTACIÓN EN N8N

### **Configuración de cada tool:**

1. **Crear 3 HTTP Request nodes:**
   - Node 1: `buscar_productos` → `/api/n8n/buscar-neumaticos` (con header `x-api-key`)
   - Node 2: `actualizar_estado` → `/api/n8n/actualizar-estado`
   - Node 3: `crear_ticket` → `/api/tools/crear_ticket`

2. **Agregar AI Agent node:**
   - Usar el prompt simplificado de `docs/prompt-agente-n8n-simplificado.md`
   - Configurar las 3 tools con los schemas de este documento

3. **Mapear campos:**
   - Los campos se autodocumentan porque cada uno tiene `description`
   - La IA mapeará automáticamente los valores desde la conversación

### **Flujo típico:**

```
1. Cliente: "Hola, necesito precio de 185/60R15 para mi Corsa"

2. AI Agent llama:
   - actualizar_estado({ 
       telefono_whatsapp: "+54...", 
       nuevo_estado: "en_conversacion",
       tipo_vehiculo: "Chevrolet Corsa",
       medida_neumatico: "185/60R15"
     })
   
   - buscar_productos({ 
       telefono_whatsapp: "+54...",
       medida_neumatico: "185/60R15", 
       region: "CABA" 
     })
   
   - actualizar_estado({ 
       telefono_whatsapp: "+54...",
       nuevo_estado: "cotizado"
     })

3. AI Agent responde con el mensaje_formateado de buscar_productos

4. Cliente: "Quiero el Pirelli en 3 cuotas"

5. AI Agent llama:
   - actualizar_estado({
       telefono_whatsapp: "+54...",
       producto_descripcion: "PIRELLI P400 EVO 185/60R15",
       forma_pago_detalle: "3 cuotas: $28.500",
       cantidad: 4,
       precio_final: 114000
     })
   
   ⚠️ Sistema automáticamente cambia estado a "esperando_pago" y genera código

6. AI Agent responde con instrucciones de pago y código de confirmación
```

---

## ⚠️ IMPORTANTE - VALIDACIÓN DE PRODUCTOS

**REGLA CRÍTICA:** Antes de llamar `actualizar_estado` con producto elegido, **SIEMPRE** llamar `buscar_productos` primero para:
1. Verificar que el producto existe
2. Obtener datos EXACTOS (marca, modelo, medida, precio)
3. Usar esos datos en `producto_descripcion` y `precio_final`

**Nunca confiar en:**
- Precios que menciona el cliente
- Nombres de productos que dice el cliente
- Cantidades implícitas (SIEMPRE preguntar)

**Siempre calcular:**
- `precio_final = precio_unitario × cantidad`
- Usar precio según forma de pago elegida (cuota_3, cuota_6, efectivo_bsas_sin_iva, etc)

---

## 🎯 ENDPOINTS COMPLETOS

```
Production:
- buscar_productos: https://top-neum-h5x5.vercel.app/api/n8n/buscar-neumaticos
- actualizar_estado: https://top-neum-h5x5.vercel.app/api/n8n/actualizar-estado
- crear_ticket: https://top-neum-h5x5.vercel.app/api/tools/crear_ticket

Headers requeridos:
- buscar_productos: x-api-key: TU_API_KEY
- actualizar_estado: (ninguno)
- crear_ticket: (ninguno)
```

---

**¡Listo para implementar en n8n! 🚀**

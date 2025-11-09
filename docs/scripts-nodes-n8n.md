# 🔄 Scripts Node.js para n8n - Gestión de Estados

## 📋 Descripción

Scripts listos para usar en **Function Nodes** de n8n para manejar el flujo de estados del lead.

---

## 1️⃣ **Detectar Región Automáticamente**

**Node Type:** `Function`
**Nombre sugerido:** `Detectar Región`

```javascript
// Extraer datos del webhook de WhatsApp
const from = $json.from || $json.telefono_whatsapp;
const messageText = $json.message?.text?.body || $json.text || '';

// Detectar región automáticamente según código de área
let region = 'INTERIOR'; // Default

if (from) {
  // Normalizar formato (quitar espacios, guiones)
  const telefonoNormalizado = from.replace(/[\s\-]/g, '');
  
  // Detectar CABA/AMBA: +54 9 11 o +5491111
  if (telefonoNormalizado.startsWith('+54911') || 
      telefonoNormalizado.startsWith('+5491111') ||
      telefonoNormalizado.includes('11') && telefonoNormalizado.startsWith('+549')) {
    region = 'CABA';
  }
}

console.log(`[Región detectada] ${from} → ${region}`);

return {
  telefono_whatsapp: from,
  mensaje_texto: messageText,
  region: region,
  timestamp: new Date().toISOString(),
  mensaje_original: $json
};
```

---

## 2️⃣ **Determinar Estado Según Respuesta del Agente**

**Node Type:** `Function`
**Nombre sugerido:** `Procesar Respuesta Agente`

```javascript
// Obtener respuesta del agente LLM
const agentResponse = $json.output || $json;

// Parsear JSON si viene como string
let agentData;
try {
  agentData = typeof agentResponse === 'string' 
    ? JSON.parse(agentResponse) 
    : agentResponse;
} catch (e) {
  console.error('Error parseando respuesta del agente:', e);
  throw new Error('Respuesta del agente no es JSON válido');
}

// Extraer datos clave
const {
  telefono_whatsapp,
  region,
  estado_actual,
  tipo_interaccion,
  datos_extraidos,
  requiere_busqueda_db,
  requiere_ticket_manual,
  mensaje_a_enviar,
  siguiente_accion
} = agentData;

// Validar datos requeridos
if (!telefono_whatsapp) {
  throw new Error('telefono_whatsapp no encontrado en respuesta del agente');
}

if (!estado_actual) {
  throw new Error('estado_actual no encontrado en respuesta del agente');
}

console.log(`[Agente] Estado determinado: ${estado_actual}`);
console.log(`[Agente] Siguiente acción: ${siguiente_accion}`);

return {
  // Datos del lead
  telefono_whatsapp,
  region: region || 'CABA',
  
  // Estado y tracking
  estado_nuevo: estado_actual,
  estado_anterior: $node["Get Estado Actual"]?.json?.lead?.estado || null,
  
  // Datos extraídos del mensaje
  datos_extraidos: datos_extraidos || {},
  
  // Flags de acción
  requiere_busqueda_db: requiere_busqueda_db || false,
  requiere_ticket_manual: requiere_ticket_manual || false,
  
  // Mensaje a enviar
  mensaje_a_enviar: mensaje_a_enviar || '',
  
  // Siguiente acción
  siguiente_accion: siguiente_accion || 'esperar_respuesta',
  
  // Data completa del agente
  agente_data_completo: agentData
};
```

---

## 3️⃣ **Preparar Payload para Actualizar Estado**

**Node Type:** `Function`
**Nombre sugerido:** `Preparar Actualización Estado`

```javascript
// Obtener datos del flujo
const telefono = $json.telefono_whatsapp;
const estadoNuevo = $json.estado_nuevo;
const datosExtraidos = $json.datos_extraidos || {};
const productos = $node["Buscar Productos"]?.json?.productos || [];

// Construir payload según el estado
let datosAdicionales = {};

switch (estadoNuevo) {
  case 'consulta_producto':
    // Guardar datos de la consulta
    datosAdicionales = {
      medida_neumatico: datosExtraidos.medida_neumatico,
      marca_preferida: datosExtraidos.marca_preferida || null,
      tipo_vehiculo: datosExtraidos.tipo_vehiculo || null,
      tipo_uso: datosExtraidos.tipo_uso || null
    };
    break;

  case 'cotizacion_enviada':
    // Guardar cotización enviada
    datosAdicionales = {
      productos_mostrados: productos,
      region: $json.region,
      precio_total_3cuotas: calcularTotal(productos, 'cuota_3'),
      precio_total_contado: calcularTotalContado(productos, $json.region)
    };
    break;

  case 'en_proceso_de_pago':
    // Guardar datos del pedido
    datosAdicionales = {
      productos: datosExtraidos.productos_elegidos || [],
      forma_pago: datosExtraidos.forma_pago || null,
      cantidad_total: datosExtraidos.cantidad_total || 4,
      subtotal: datosExtraidos.subtotal || 0,
      descuento_porcentaje: calcularDescuento(datosExtraidos.forma_pago),
      total: datosExtraidos.total || 0,
      requiere_sena: esEfectivo(datosExtraidos.forma_pago),
      monto_sena: calcularSena(datosExtraidos.total)
    };
    break;

  case 'turno_agendado':
    // Guardar datos de entrega/colocación
    datosAdicionales = {
      tipo_entrega: datosExtraidos.tipo_entrega || null,
      fecha_turno: datosExtraidos.fecha_turno || null,
      hora_turno: datosExtraidos.hora_turno || null,
      direccion_envio: datosExtraidos.direccion_envio || null
    };
    break;

  default:
    // Para otros estados, pasar los datos extraídos tal cual
    datosAdicionales = datosExtraidos;
}

console.log(`[Estado] Preparando actualización: ${estadoNuevo}`);

return {
  telefono_whatsapp: telefono,
  nuevo_estado: estadoNuevo,
  cambiado_por: 'agente_llm',
  datos_adicionales: datosAdicionales
};

// ====== FUNCIONES HELPER ======

function calcularTotal(productos, campo) {
  if (!productos || productos.length === 0) return 0;
  return productos.reduce((sum, p) => {
    const precio = parseFloat(p[campo]) || 0;
    const cantidad = p.cantidad || 4;
    return sum + (precio * cantidad);
  }, 0);
}

function calcularTotalContado(productos, region) {
  if (!productos || productos.length === 0) return 0;
  const campo = region === 'CABA' 
    ? 'efectivo_bsas_sin_iva' 
    : 'efectivo_interior_sin_iva';
  return calcularTotal(productos, campo);
}

function calcularDescuento(formaPago) {
  if (!formaPago) return 0;
  if (formaPago.includes('sin_factura')) return 10;
  if (formaPago.includes('con_factura')) return 5;
  return 0;
}

function esEfectivo(formaPago) {
  if (!formaPago) return false;
  return formaPago.includes('efectivo');
}

function calcularSena(total) {
  return Math.round(total * 0.30); // 30% de seña
}
```

---

## 4️⃣ **Manejo de Errores y Validaciones**

**Node Type:** `Function`
**Nombre sugerido:** `Validar y Manejar Errores`

```javascript
// Obtener resultado del HTTP Request
const httpResponse = $json;

// Verificar si hubo error
if (httpResponse.error) {
  console.error('[Error API]', httpResponse.error);
  
  // Determinar mensaje de error para el cliente
  let mensajeError = '⚠️ Disculpá, tuve un problema técnico. Un asesor te va a contactar en breve.';
  
  // Crear ticket automático para casos de error
  return {
    error: true,
    error_message: httpResponse.error,
    crear_ticket: true,
    ticket_tipo: 'error_tecnico',
    ticket_descripcion: `Error en API: ${httpResponse.error}`,
    mensaje_cliente: mensajeError,
    telefono_whatsapp: $node["Detectar Región"].json.telefono_whatsapp
  };
}

// Validar respuesta exitosa
if (!httpResponse.success && httpResponse.success !== undefined) {
  console.warn('[Advertencia API]', httpResponse);
  
  return {
    error: true,
    error_message: 'Respuesta no exitosa de la API',
    mensaje_cliente: '⚠️ Hubo un problema. Reintentá en unos segundos.',
    telefono_whatsapp: $node["Detectar Región"].json.telefono_whatsapp
  };
}

// Todo OK, pasar al siguiente node
console.log('[Validación] ✓ Respuesta válida');
return {
  ...httpResponse,
  error: false,
  validated: true
};
```

---

## 5️⃣ **Preparar Mensaje Final para WhatsApp**

**Node Type:** `Function`
**Nombre sugerido:** `Formatear Mensaje WhatsApp`

```javascript
// Obtener datos del flujo
const requiereBusquedaDB = $json.requiere_busqueda_db;
const mensajeAgente = $json.mensaje_a_enviar;
const mensajeDB = $node["Buscar Productos"]?.json?.mensaje;

// Determinar qué mensaje enviar
let mensajeFinal = '';

if (requiereBusquedaDB && mensajeDB) {
  // Si hubo búsqueda en DB, usar ese mensaje (tiene los productos)
  mensajeFinal = mensajeDB;
  console.log('[Mensaje] Usando mensaje de búsqueda DB');
} else {
  // Si no, usar mensaje del agente
  mensajeFinal = mensajeAgente;
  console.log('[Mensaje] Usando mensaje del agente');
}

// Validar que haya mensaje
if (!mensajeFinal || mensajeFinal.trim() === '') {
  console.error('[Mensaje] ERROR: No hay mensaje para enviar');
  mensajeFinal = '⚠️ Disculpá, tuve un problema generando la respuesta. Un asesor te contacta en breve.';
}

// Agregar firma si es necesario (opcional)
// mensajeFinal += '\n\n---\nTopNeum - Neumáticos con garantía';

return {
  telefono_whatsapp: $json.telefono_whatsapp,
  mensaje_final: mensajeFinal,
  estado_nuevo: $json.estado_nuevo,
  timestamp: new Date().toISOString()
};
```

---

## 6️⃣ **Decidir si Crear Ticket Manual**

**Node Type:** `Function`
**Nombre sugerido:** `Verificar Ticket Manual`

```javascript
// Obtener flags del agente
const requiereTicket = $json.requiere_ticket_manual;
const datosExtraidos = $json.datos_extraidos || {};
const mensajeCliente = $node["Detectar Región"].json.mensaje_texto;

// Si el agente dice que requiere ticket
if (requiereTicket) {
  console.log('[Ticket] Se requiere atención manual');
  
  // Determinar tipo de ticket
  let tipoTicket = 'otro';
  let prioridad = 'media';
  
  if (mensajeCliente.toLowerCase().includes('michelin') || 
      mensajeCliente.toLowerCase().includes('bf goodrich')) {
    tipoTicket = 'marca_especial';
    prioridad = 'alta';
  } else if (datosExtraidos.medida_neumatico && 
             (!$node["Buscar Productos"]?.json?.productos || 
              $node["Buscar Productos"].json.productos.length === 0)) {
    tipoTicket = 'medida_no_disponible';
    prioridad = 'media';
  }
  
  return {
    crear_ticket: true,
    ticket: {
      telefono_whatsapp: $json.telefono_whatsapp,
      tipo: tipoTicket,
      descripcion: `Cliente: ${mensajeCliente}\nMedida: ${datosExtraidos.medida_neumatico || 'N/A'}`,
      prioridad: prioridad
    },
    mensaje_cliente: $json.mensaje_a_enviar
  };
}

// No requiere ticket, continuar flujo normal
console.log('[Ticket] No se requiere atención manual');
return {
  crear_ticket: false,
  mensaje_cliente: $json.mensaje_a_enviar
};
```

---

## 7️⃣ **Logging y Debugging**

**Node Type:** `Function`
**Nombre sugerido:** `Log Debugging`

```javascript
// Recopilar información de debugging
const debugInfo = {
  timestamp: new Date().toISOString(),
  telefono: $json.telefono_whatsapp,
  region: $json.region,
  estado_actual: $json.estado_nuevo,
  mensaje_length: $json.mensaje_final?.length || 0,
  requiere_busqueda: $json.requiere_busqueda_db,
  productos_encontrados: $node["Buscar Productos"]?.json?.cantidad || 0,
  error: $json.error || false
};

// Log en consola de n8n
console.log('====================================');
console.log('[DEBUG] Información del flujo:');
console.log(JSON.stringify(debugInfo, null, 2));
console.log('====================================');

// Verificar warnings
const warnings = [];

if (!$json.telefono_whatsapp) {
  warnings.push('⚠️ Falta teléfono de WhatsApp');
}

if (!$json.mensaje_final || $json.mensaje_final.length < 10) {
  warnings.push('⚠️ Mensaje muy corto o vacío');
}

if ($json.requiere_busqueda_db && (!$node["Buscar Productos"] || $node["Buscar Productos"].json.cantidad === 0)) {
  warnings.push('⚠️ Búsqueda requerida pero sin resultados');
}

if (warnings.length > 0) {
  console.warn('[WARNINGS]', warnings);
}

// Pasar data sin modificar (solo para logging)
return $json;
```

---

## 8️⃣ **Integración Completa: Node de Cambio de Estado**

**Node Type:** `Function`
**Nombre sugerido:** `Cambiar Estado Lead`
**Posición en el workflow:** Después de procesar respuesta del agente y antes de enviar WhatsApp

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
    // Pago confirmado (esto lo hará el CRM)
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

---

## 📋 **Orden Recomendado de Nodes en n8n**

```
1. Webhook Trigger
   ↓
2. Function: "Detectar Región"
   ↓
3. HTTP Request: "Registrar Mensaje Entrante"
   ↓
4. OpenAI/Anthropic: "Agente LLM"
   ↓
5. Function: "Procesar Respuesta Agente"
   ↓
6. IF: "¿Requiere Búsqueda DB?"
   ↓ (SÍ)
   7. HTTP Request: "Buscar Productos"
   ↓
8. Function: "Cambiar Estado Lead" ← ¡ESTE ES EL CLAVE!
   ↓
9. HTTP Request: "Actualizar Estado" ← Llama a /api/n8n/actualizar-estado
   ↓
10. Function: "Validar y Manejar Errores"
   ↓
11. Function: "Formatear Mensaje WhatsApp"
   ↓
12. HTTP Request: "Registrar Mensaje Saliente"
   ↓
13. WhatsApp: "Enviar Mensaje"
```

---

## 🔗 **Configuración del HTTP Request para Actualizar Estado**

**Node Type:** `HTTP Request`
**Nombre:** `Actualizar Estado`

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
  "bodyParameters": {
    "parameters": [
      {
        "name": "telefono_whatsapp",
        "value": "={{$json.telefono_whatsapp}}"
      },
      {
        "name": "nuevo_estado",
        "value": "={{$json.nuevo_estado}}"
      },
      {
        "name": "cambiado_por",
        "value": "={{$json.cambiado_por}}"
      },
      {
        "name": "datos_adicionales",
        "value": "={{JSON.stringify($json.datos_adicionales)}}"
      }
    ]
  }
}
```

---

## ✅ **Checklist de Implementación**

- [ ] Crear Function Node "Detectar Región"
- [ ] Crear Function Node "Procesar Respuesta Agente"
- [ ] Crear Function Node "Cambiar Estado Lead"
- [ ] Crear HTTP Request Node "Actualizar Estado"
- [ ] Crear Function Node "Validar y Manejar Errores"
- [ ] Crear Function Node "Formatear Mensaje WhatsApp"
- [ ] Configurar variables de entorno en n8n
- [ ] Testear cada node individualmente
- [ ] Testear flujo completo

---

**¡Scripts listos para copiar y pegar en n8n! 🚀**

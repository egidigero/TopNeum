# 🛠️ Definición de Herramientas para n8n

Este documento contiene las definiciones de las 3 herramientas que el agente debe usar para interactuar con TopNeum.

---

## Tool 1: `buscar_productos`

### Descripción
Busca neumáticos en el catálogo según medida, marca (opcional) y región. Devuelve lista ordenada por relevancia con precios y stock.

### Cuándo usar
- Cliente menciona medida de neumático (ej: 205/55R16)
- Cliente pregunta "¿Cuánto sale...?"
- Cliente consulta disponibilidad o stock
- **SIEMPRE antes de crear un pedido** (validar productos disponibles)

### Parámetros

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `medida_neumatico` | string | ✅ Sí | Medida del neumático en formato estándar | `"205/55R16"` |
| `marca` | string | ❌ No | Marca preferida (opcional). Si no se especifica, muestra todas | `"Pirelli"` |
| `region` | string | ✅ Sí | Región del cliente: `CABA` o `INTERIOR` | `"CABA"` |

### Valores de Retorno

```json
{
  "productos": [
    {
      "id": 123,
      "medida": "205/55R16",
      "marca": "PIRELLI",
      "modelo": "P7",
      "precio_unitario": 45000,
      "precio_3cuotas": 49500,
      "precio_6cuotas": 54000,
      "precio_12cuotas": 63000,
      "precio_contado_caba": 40500,
      "precio_contado_caba_con_factura": 42750,
      "precio_contado_interior": 45000,
      "stock": "disponible",
      "indice_carga": "91",
      "indice_velocidad": "V"
    }
  ],
  "cantidad_total": 5
}
```

### Ejemplo de uso en n8n

**Input:**
```json
{
  "medida_neumatico": "185/65R15",
  "marca": "Fate",
  "region": "INTERIOR"
}
```

**Output esperado:**
Lista de 3-5 productos Fate 185/65R15 con precios para interior, ordenados por relevancia.

---

## Tool 2: `actualizar_estado`

### Descripción
Actualiza el estado del lead en el CRM y registra información adicional de la conversación. **Si el lead no existe, lo crea automáticamente.**

### Cuándo usar
- **Al inicio de cada conversación** (crea el lead si es nuevo)
- Cuando el cliente avanza en el funnel
- Cuando se obtiene información nueva del cliente
- Después de buscar productos
- Al confirmar pedido
- Al finalizar conversación

### Parámetros

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `telefono_whatsapp` | string | ✅ Sí | Número de WhatsApp del cliente (formato +54 9 11 XXXX XXXX) | `"+54 9 11 1234 5678"` |
| `nuevo_estado` | string | ✅ Sí | Estado del lead (ver valores válidos abajo) | `"cotizado"` |
| `nombre_cliente` | string | ❌ No | Nombre del cliente | `"Juan Pérez"` |
| `tipo_vehiculo` | string | ❌ No | Tipo de vehículo del cliente | `"Auto"` / `"Camioneta"` / `"SUV"` |
| `producto_descripcion` | string | ❌ No | Descripción del producto de interés | `"PIRELLI P7 205/55R16"` |
| `forma_pago_detalle` | string | ❌ No | Detalle de forma de pago elegida | `"3 cuotas sin factura: $34.200"` |
| `precio_final` | number | ❌ No | Precio final del pedido | `102600` |
| `cantidad` | number | ❌ No | Cantidad de neumáticos | `4` |
| `datos_adicionales` | object | ❌ No | Cualquier otro dato relevante | `{"medida_neumatico": "205/55R16"}` |

### Estados Válidos

| Estado | Descripción | Cuándo usar |
|--------|-------------|-------------|
| `nuevo` | Lead recién creado | Primera interacción (automático) |
| `en_conversacion` | Cliente está consultando | Después de `buscar_productos` |
| `cotizado` | Se le enviaron precios | Después de mostrar opciones |
| `esperando_pago` | Cliente confirmó pedido | Al enviar link de pago |
| `perdido` | Cliente no sigue interesado | Cliente dice "no me interesa" o similar |
| `completado` | Pedido pagado y completado | Cuando el pago se confirma (webhook de MercadoPago) |

### Valores de Retorno

```json
{
  "success": true,
  "lead_id": 456,
  "estado_anterior": "nuevo",
  "estado_actual": "cotizado",
  "mensaje": "Lead actualizado correctamente"
}
```

### Ejemplos de uso en n8n

**Ejemplo 1: Primera conversación (crea lead)**
```json
{
  "telefono_whatsapp": "+54 9 11 1234 5678",
  "nuevo_estado": "en_conversacion",
  "nombre_cliente": "Juan Pérez",
  "tipo_vehiculo": "Auto",
  "datos_adicionales": {
    "medida_neumatico": "205/55R16"
  }
}
```

**Ejemplo 2: Después de mostrar precios**
```json
{
  "telefono_whatsapp": "+54 9 11 1234 5678",
  "nuevo_estado": "cotizado",
  "producto_descripcion": "PIRELLI P7 205/55R16",
  "datos_adicionales": {
    "cantidad_opciones": 5,
    "medida_cotizada": "205/55R16"
  }
}
```

**Ejemplo 3: Cliente confirma pedido**
```json
{
  "telefono_whatsapp": "+54 9 11 1234 5678",
  "nuevo_estado": "esperando_pago",
  "producto_descripcion": "HANKOOK OPTIMO H426 205/55R16",
  "forma_pago_detalle": "3 cuotas sin factura: $34.200",
  "precio_final": 102600,
  "cantidad": 4
}
```

**Ejemplo 4: Cliente no sigue**
```json
{
  "telefono_whatsapp": "+54 9 11 1234 5678",
  "nuevo_estado": "perdido",
  "datos_adicionales": {
    "motivo": "Cliente dijo que va a consultar en otro lado"
  }
}
```

---

## Tool 3: `crear_ticket` 🆕

### Descripción
Crea un ticket de soporte para consultas especiales, marcas premium, medidas no disponibles, problemas técnicos o reclamos.

### Cuándo usar
- Cliente pregunta por **Michelin** o **BF Goodrich**
- La medida solicitada **NO aparece** en resultados de `buscar_productos`
- Cliente tiene **consulta técnica** compleja
- Cliente reporta **problema con el pago**
- Cliente hace un **reclamo**

### Parámetros

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `telefono_whatsapp` | string | ✅ Sí | Número de WhatsApp del cliente | `"+54 9 11 1234 5678"` |
| `tipo` | string | ✅ Sí | Tipo de ticket (ver valores válidos abajo) | `"marca_especial"` |
| `descripcion` | string | ✅ Sí | Descripción detallada del problema/consulta | Ver ejemplos abajo |
| `prioridad` | string | ✅ Sí | Nivel de prioridad (ver valores válidos abajo) | `"alta"` |

### Tipos de Ticket Válidos

| Tipo | Descripción | Ejemplo de uso |
|------|-------------|----------------|
| `marca_especial` | Consulta por Michelin o BF Goodrich | Cliente pregunta por Michelin Energy 205/55R16 |
| `medida_no_disponible` | Medida no encontrada en catálogo | Cliente necesita 225/75R16 y no hay stock |
| `consulta_tecnica` | Pregunta técnica compleja | Cliente pregunta por índice de carga específico |
| `problema_pago` | Error en el proceso de pago | Link de MercadoPago no funciona |
| `reclamo` | Queja o problema con pedido | Cliente recibió producto defectuoso |
| `otro` | Cualquier otro caso | Consulta general no categorizable |

### Prioridades Válidas

| Prioridad | Cuándo usar | Tiempo de respuesta esperado |
|-----------|-------------|------------------------------|
| `baja` | Consultas generales | 24-48 horas |
| `media` | Medidas no disponibles | 12-24 horas |
| `alta` | Marcas premium, consultas técnicas | 2-4 horas |
| `urgente` | Reclamos, problemas de pago | 1 hora |

### Descripción del Ticket (Mejores Prácticas)

**✅ BUENA descripción:**
```
Cliente Juan Pérez consulta Michelin Energy XM2+ 205/55R16 para su Corolla 2018.
Preguntó por disponibilidad y precio con instalación incluida.
Cliente en CABA. Última interacción: 2025-01-16 14:30.
```

**❌ MALA descripción:**
```
Cliente pregunta por Michelin.
```

### Valores de Retorno

```json
{
  "success": true,
  "ticket_id": 789,
  "lead_id": 456,
  "tipo": "marca_especial",
  "prioridad": "alta",
  "estado": "pendiente",
  "mensaje": "Ticket creado correctamente"
}
```

### Ejemplos de uso en n8n

**Ejemplo 1: Consulta Michelin**
```json
{
  "telefono_whatsapp": "+54 9 11 1234 5678",
  "tipo": "marca_especial",
  "descripcion": "Cliente Juan Pérez consulta Michelin Energy XM2+ 205/55R16 para Corolla 2018. Preguntó por disponibilidad y precio. Región: CABA. Última interacción: 2025-01-16 14:30.",
  "prioridad": "alta"
}
```

**Ejemplo 2: Medida no disponible**
```json
{
  "telefono_whatsapp": "+54 9 11 2345 6789",
  "tipo": "medida_no_disponible",
  "descripcion": "Cliente María López solicita 225/75R16 para Hilux 2020. Medida no disponible en catálogo actual. Región: INTERIOR. Cliente dispuesto a esperar 1-2 semanas. Última interacción: 2025-01-16 15:00.",
  "prioridad": "media"
}
```

**Ejemplo 3: Problema de pago urgente**
```json
{
  "telefono_whatsapp": "+54 9 11 3456 7890",
  "tipo": "problema_pago",
  "descripcion": "Cliente Carlos Gómez reporta error al intentar pagar con link de MercadoPago. Link: https://mpago.li/xxx. Error: 'Página no encontrada'. Pedido: 4 HANKOOK 205/55R16. Total: $102.600. Cliente esperando pagar ahora. Última interacción: 2025-01-16 16:00.",
  "prioridad": "urgente"
}
```

**Ejemplo 4: Reclamo**
```json
{
  "telefono_whatsapp": "+54 9 11 4567 8901",
  "tipo": "reclamo",
  "descripcion": "Cliente Ana Martínez reclama que recibió neumático con defecto visible en la banda de rodadura. Pedido #1234 realizado el 2025-01-10. Producto: PIRELLI P7 205/55R16. Cliente solicita cambio urgente. Región: CABA. Última interacción: 2025-01-16 17:00.",
  "prioridad": "urgente"
}
```

---

## 📋 Configuración en n8n

### Paso 1: Crear HTTP Request Node para cada herramienta

**Node 1: Buscar Productos**
- Method: `POST`
- URL: `https://tu-dominio.com/api/tools/buscar_productos`
- Authentication: None (o según tu configuración)
- Body:
  ```json
  {
    "medida_neumatico": "{{ $json.medida }}",
    "marca": "{{ $json.marca }}",
    "region": "{{ $json.region }}"
  }
  ```

**Node 2: Actualizar Estado**
- Method: `POST`
- URL: `https://tu-dominio.com/api/tools/actualizar_estado`
- Body:
  ```json
  {
    "telefono_whatsapp": "{{ $json.telefono }}",
    "nuevo_estado": "{{ $json.estado }}",
    "nombre_cliente": "{{ $json.nombre }}",
    "tipo_vehiculo": "{{ $json.vehiculo }}",
    "producto_descripcion": "{{ $json.producto }}",
    "forma_pago_detalle": "{{ $json.forma_pago }}",
    "precio_final": "{{ $json.precio }}",
    "cantidad": "{{ $json.cantidad }}",
    "datos_adicionales": "{{ $json.datos_extra }}"
  }
  ```

**Node 3: Crear Ticket**
- Method: `POST`
- URL: `https://tu-dominio.com/api/tools/crear_ticket`
- Body:
  ```json
  {
    "telefono_whatsapp": "{{ $json.telefono }}",
    "tipo": "{{ $json.tipo_ticket }}",
    "descripcion": "{{ $json.descripcion }}",
    "prioridad": "{{ $json.prioridad }}"
  }
  ```

### Paso 2: Configurar AI Agent

**En el nodo AI Agent de n8n:**

1. **System Message:** Pegar el contenido de `prompt-agente-con-tools.md`
2. **Tools:** Conectar los 3 HTTP Request Nodes creados arriba
3. **Tool Names:**
   - `buscar_productos`
   - `actualizar_estado`
   - `crear_ticket`

### Paso 3: Conectar con WhatsApp

Usar el nodo de WhatsApp Business API o Twilio para recibir mensajes y enviar respuestas.

---

## 🔍 Testing de Herramientas

### Test 1: Buscar Productos
```bash
curl -X POST https://tu-dominio.com/api/tools/buscar_productos \
  -H "Content-Type: application/json" \
  -d '{
    "medida_neumatico": "205/55R16",
    "region": "CABA"
  }'
```

**Resultado esperado:** Lista de 5 productos con precios.

### Test 2: Actualizar Estado (crear lead)
```bash
curl -X POST https://tu-dominio.com/api/tools/actualizar_estado \
  -H "Content-Type: application/json" \
  -d '{
    "telefono_whatsapp": "+54 9 11 1234 5678",
    "nuevo_estado": "en_conversacion",
    "nombre_cliente": "Juan Test",
    "datos_adicionales": {"medida_neumatico": "205/55R16"}
  }'
```

**Resultado esperado:** `{ "success": true, "lead_id": 123 }`

### Test 3: Crear Ticket
```bash
curl -X POST https://tu-dominio.com/api/tools/crear_ticket \
  -H "Content-Type: application/json" \
  -d '{
    "telefono_whatsapp": "+54 9 11 1234 5678",
    "tipo": "marca_especial",
    "descripcion": "Cliente consulta Michelin Energy 205/55R16",
    "prioridad": "alta"
  }'
```

**Resultado esperado:** `{ "success": true, "ticket_id": 789 }`

---

## ⚠️ Notas Importantes

1. **Normalización de teléfonos:** El sistema automáticamente normaliza números de teléfono (agrega +54 si falta)
2. **Creación automática de leads:** Si un teléfono no existe, `actualizar_estado` crea el lead automáticamente
3. **Orden de llamadas:** Siempre llamar a `actualizar_estado` después de `buscar_productos` para registrar la interacción
4. **Tickets y Michelin:** NUNCA usar `buscar_productos` para Michelin o BF Goodrich, siempre crear ticket
5. **Descripción de tickets:** Incluir SIEMPRE: nombre del cliente, detalles del pedido/consulta, región, fecha/hora

---

## 📚 Recursos Adicionales

- **Prompt completo del agente:** Ver `docs/prompt-agente-con-tools.md`
- **Documentación de webhooks:** Ver `docs/prompt.md`
- **Testing E2E:** Ver `CHANGELOG.md` sección "Testing"

---

**Versión:** 1.0  
**Fecha:** 16 de Enero 2025  
**Autor:** TopNeum Development Team
